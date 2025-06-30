import { DataSource } from 'typeorm';
import { IdentityVerificationStorage } from '../storage/entities/identityVerificationStorage';
import { IdentityVerificationStorageRepository } from '../storage/identityVerificationStorageRepository';
import { Message } from '../services/communication/message';
import { VerificationMessage } from '../services/communication/message';
import { UserCommunication } from './UserCommunication';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { VeriffSubscriber } from '../services/communication/communication';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { IdentityVerificationStorageManager } from '../storage/identityVerificationStorageManager';
import { verifyOpsTmyDid } from '../util/ssi/did';

class ConcreteKeyManager extends IdentityVerificationStorageManager {
    constructor(repository: IdentityVerificationStorageRepository) {
        super(repository);
    }
}

export class UserDataVault extends UserCommunication {
    private readonly repository: IdentityVerificationStorageRepository;
    protected identityVerification: ConcreteKeyManager;

    constructor(keyManager: KeyManager, storageFactory: StorageFactory, dataSource: DataSource) {
        super(keyManager, storageFactory);
        this.repository = new IdentityVerificationStorageRepository(dataSource);
        this.identityVerification = new ConcreteKeyManager(this.repository);
    }

    /**
     * Subscribes to verification updates
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribeToVerificationUpdates(): Promise<IdentityVerificationStorage> {
        const handler: VeriffSubscriber = async (message: Message): Promise<IdentityVerificationStorage | null> => {
            try {
                return await this.handleVerificationUpdate(message);
            } catch (error) {
                console.error('Error processing verification message:', error);
                return null;
            }
        };

        return this.communication.waitForVeriffVerification(handler);
    }

    /**
     * Handle a verification update message by parsing it and updating the verification record
     * @param message The verification message
     * @returns The updated verification record
     * @throws {Error} If message type is incorrect or verification update fails
     */
    private async handleVerificationUpdate(message: Message): Promise<IdentityVerificationStorage[] | null> {
        await message.verify();

        const did = message.getIssuer();

        await verifyOpsTmyDid(did);

        const payload = (message as VerificationMessage).payload;

        if (!payload?.vc) {
            throw new Error('Invalid verification update message');
        }

        // Parse the new verification status
        const vc = payload.vc;

        const newStatus = VeriffStatusEnum.from(payload.type);

        const mapKeyToVerificcationType = (key: string): VerificationTypeEnum | null => {
            return VerificationTypeEnum.from(key);
        };
        const updatedVerifications: IdentityVerificationStorage[] = [];

        for (const [key, signedVc] of Object.entries(vc)) {
            const type = mapKeyToVerificcationType(key);
            let verification = await this.identityVerification.findByVeriffIdAndType(
                payload.veriffId,
                type as VerificationTypeEnum
            );

            if (verification) {
                verification.vc = signedVc.toString();
                verification.status = newStatus;
                await this.identityVerification.updateRecord(verification);
            } else {
                await this.identityVerification.createVc(
                    payload.veriffId,
                    signedVc.toString(),
                    newStatus,
                    type as VerificationTypeEnum
                );
                verification = await this.identityVerification.findByVeriffIdAndType(
                    payload.veriffId,
                    type as VerificationTypeEnum
                );
            }

            if (verification) {
                updatedVerifications.push(verification);
            }
        }

        return updatedVerifications;
    }

    /**
     * Unsubscribes from verification updates
     * @param subscriptionId The ID returned from subscribeToVerificationUpdates
     */
    unsubscribeFromVerificationUpdates(subscriptionId: number): void {
        this.communication.unsubscribeMessage(subscriptionId);
    }
}
