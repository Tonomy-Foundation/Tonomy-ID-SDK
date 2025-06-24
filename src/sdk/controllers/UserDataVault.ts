import { DataSource } from 'typeorm';
import {
    getStatusFromValue,
    getVerificationKeyFromValue,
    VerificationType,
} from '../storage/entities/identityVerificationStorage';
import { IdentityVerificationStorageRepository } from '../storage/identityVerificationStorageRepository';
import { Message } from '../services/communication/message';
import { VerificationMessage } from '../services/communication/message';
import { UserCommunication } from './UserCommunication';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { Subscriber } from '../services/communication/communication';

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
            try {
                await this.handleVerificationUpdate(message);
            } catch (error) {
                console.error('Error processing verification message:', error);
            }
        };

        return this.communication.subscribeToVeriffVerification(handler);
    }

    /**
     * Handle a verification update message by parsing it and updating the verification record
     * @param message The verification message
     * @returns The updated verification record
     * @throws {Error} If message type is incorrect or verification update fails
     */
    private async handleVerificationUpdate(message: Message): Promise<void> {
        const payload = (message as VerificationMessage).payload;

        if (!payload?.vc) {
            throw new Error('Invalid verification update message');
        }

        // Parse the new verification status
        const vc = JSON.parse(payload.vc.toString());
        const newStatus = getStatusFromValue(vc.status);

        let vcEntries: Record<string, string>;

        try {
            vcEntries = JSON.parse(payload.vc.toString());
        } catch {
            throw new Error('Failed to parse VC payload JSON');
        }

        const mapKeyToVerificcationType = (key: string): VerificationType | null => {
            return getVerificationKeyFromValue(key);
        };

        for (const [key, signedVc] of Object.entries(vcEntries)) {
            const type = mapKeyToVerificcationType(key);
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
