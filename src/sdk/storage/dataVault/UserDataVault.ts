/* eslint-disable indent */
import { DataSource } from 'typeorm';
import { VerificationType } from '../entities/identityVerificationStorage';
import { VcStatus } from '../entities/identityVerificationStorage';
import { IdentityVerificationStorageRepository } from '../identityVerificationStorageRepository';
import { Message } from '../../services/communication/message';
import { VerificationMessage } from '../../services/communication/message';
import { UserCommunication } from '../../controllers/UserCommunication';
import { KeyManager } from '../../storage/keymanager';
import { StorageFactory } from '../../storage/storage';
import { Subscriber } from '../../services/communication/communication';

export class UserDataVault extends UserCommunication {
    private readonly repository: IdentityVerificationStorageRepository;

    constructor(keyManager: KeyManager, storageFactory: StorageFactory, dataSource: DataSource) {
        super(keyManager, storageFactory);
        this.repository = new IdentityVerificationStorageRepository(dataSource);
    }

    /**
     * Subscribes to verification updates
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribeToVerificationUpdates(): number {
        const handler: Subscriber = async (message: Message): Promise<void> => {
            if (message.getType() === 'VeriffVerificationMessage') {
                try {
                    await this.handleVerificationUpdate(message as VerificationMessage);
                } catch (error) {
                    console.error('Error processing verification update:', error);
                }
            }
        };

        return this.communication.subscribeToVeriffVerification(handler);
    }

    /**
     * Handle a verification update message by parsing it and updating the verification record
     * @param message The verification update message
     * @returns The updated verification record
     */
    private async handleVerificationUpdate(message: VerificationMessage): Promise<void> {
        const payload = message.payload;

        if (!payload?.vc) {
            throw new Error('Invalid verification update message');
        }

        // Parse the new verification status
        const vc = JSON.parse(message.payload.vc);
        const newStatus =
            vc.status === 'APPROVED'
                ? VcStatus.APPROVED
                : vc.status === 'REJECTED'
                  ? VcStatus.REJECTED
                  : VcStatus.PENDING;

        let vcEntries: Record<string, string>;

        try {
            vcEntries = JSON.parse(payload.vc);
        } catch {
            throw new Error('Failed to parse VC payload JSON');
        }

        const mapKeyToType = (key: string): VerificationType | null => {
            const typeMap: Record<string, VerificationType> = {
                kyc: VerificationType.KYC,
                address: VerificationType.ADDRESS,
                firstName: VerificationType.FIRST_NAME,
                lastName: VerificationType.LAST_NAME,
                birthDate: VerificationType.DOB,
                nationality: VerificationType.NATIONALITY,
            };

            return typeMap[key] ?? null;
        };

        for (const [key, signedVc] of Object.entries(vcEntries)) {
            const type = mapKeyToType(key);
            const existing = await this.repository.findByVeriffIdAndType(payload.veriffId, type as VerificationType);

            if (existing) {
                existing.vc = signedVc;
                existing.status = newStatus;
                existing.updatedAt = new Date();
                await this.repository.update(existing);
            } else {
                await this.repository.create(payload.veriffId, signedVc, newStatus, type as VerificationType);
            }
        }
    }

    /**
     * Unsubscribes from verification updates
     * @param subscriptionId The ID returned from subscribeToVerificationUpdates
     */
    unsubscribeFromVerificationUpdates(subscriptionId: number): void {
        this.communication.unsubscribeMessage(subscriptionId);
    }
}
