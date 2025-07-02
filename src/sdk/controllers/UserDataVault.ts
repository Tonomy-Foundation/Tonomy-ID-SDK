import { DataSource } from 'typeorm';
import { IdentityVerificationStorage } from '../storage/entities/identityVerificationStorage';
import { IdentityVerificationStorageRepository } from '../storage/identityVerificationStorageRepository';
import { VerificationMessage } from '../services/communication/message';
import { UserCommunication } from './UserCommunication';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { VeriffSubscriber } from '../services/communication/communication';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { IdentityVerificationStorageManager } from '../storage/identityVerificationStorageManager';
import { verifyOpsTmyDid } from '../util/ssi/did';
import { castDecisionToStatus } from '../util';

export class UserDataVault extends UserCommunication {
    private readonly idVerificationManager: IdentityVerificationStorageManager;

    constructor(keyManager: KeyManager, storageFactory: StorageFactory, dataSource: DataSource) {
        super(keyManager, storageFactory);
        this.idVerificationManager = new IdentityVerificationStorageManager(dataSource);
    }

    /**
     * Subscribes to verification updates
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribeToVerificationUpdates(): Promise<IdentityVerificationStorage[] | null> {
        const handler: VeriffSubscriber = async (
            message: VerificationMessage
        ): Promise<IdentityVerificationStorage[] | null> => {
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
    private async handleVerificationUpdate(
        message: VerificationMessage
    ): Promise<IdentityVerificationStorage[] | null> {
        await message.verify();

        const did = message.getIssuer();

        await verifyOpsTmyDid(did);

        const vcPayload = message.getPayload();

        const kycPayload = vcPayload.kyc.getPayload();
        const decision = kycPayload.data.verification.decision;

        const status = castDecisionToStatus(decision);

        const updatedVerifications: IdentityVerificationStorage[] = [];

        for (const [key, signedVc] of Object.entries(vcPayload)) {
            const type = VerificationTypeEnum.from(key);
            let verification = await this.idVerificationManager.findByVeriffIdAndType(kycPayload.sessionId, type);

            if (verification) {
                verification.vc = signedVc.toString();
                verification.status = status;
                await this.idVerificationManager.updateRecord(verification);
            } else {
                await this.idVerificationManager.createVc(kycPayload.sessionId, signedVc.toString(), status, type);
                verification = await this.idVerificationManager.findByVeriffIdAndType(kycPayload.sessionId, type);
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
