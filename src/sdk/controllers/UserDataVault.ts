import { DataSource } from 'typeorm';
import { VerificationMessage } from '../services/communication/message';
import { UserCommunication } from './UserCommunication';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { VeriffSubscriber } from '../services/communication/communication';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { IdentityVerificationStorageManager } from '../storage/identityVerificationStorageManager';
import { verifyOpsTmyDid } from '../util/ssi/did';
import { castDecisionToStatus, KYCPayload, KYCVC, PersonCredentialType } from '../util';
import { IUserDataVault } from '../types/User';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:controllers:UserDataVault');

export class UserDataVault extends UserCommunication implements IUserDataVault {
    private readonly idVerificationManager: IdentityVerificationStorageManager;

    constructor(keyManager: KeyManager, storageFactory: StorageFactory, dataSource: DataSource) {
        super(keyManager, storageFactory);
        this.idVerificationManager = new IdentityVerificationStorageManager(dataSource);
    }

    /**
     * Handle a verification update message by parsing it and updating the verification record
     * @param message The verification message
     * @throws {Error} If message type is incorrect or verification update fails
     */
    private handleVerificationUpdate: VeriffSubscriber = async (message: VerificationMessage): Promise<void> => {
        debug('handleVerificationUpdate()', message.getIssuer(), message.getPayload());
        await message.verify();

        const did = message.getIssuer();

        await verifyOpsTmyDid(did);

        const vcPayload = message.getPayload();
        const kycPayload = vcPayload.kyc.getPayload();
        const decision = kycPayload.data.verification.decision;
        const status = castDecisionToStatus(decision);

        debug('handleVerificationUpdate() kycPayload', did, kycPayload);

        for (const [key, signedVc] of Object.entries(vcPayload)) {
            const type = VerificationTypeEnum.from(key);

            await this.idVerificationManager.emplaceByVeriffIdAndType(kycPayload.sessionId, type, status, signedVc);
            debug(`handleVerificationUpdate() successfully stored ${key} VC in storage`);
        }
    };

    /**
     * Waits for the next Veriff verification message, calls the handler, and returns the KYCPayload of the message.
     * Used for one-time waiting scenarios (e.g., frontend waiting screen).
     *
     * @returns {Promise<KYCPayload>}
     */
    async waitForNextVeriffVerification(): Promise<KYCPayload> {
        let id: number | undefined;

        return await new Promise<KYCPayload>((resolve, reject) => {
            const newHandler: VeriffSubscriber = async (message: VerificationMessage): Promise<void> => {
                try {
                    debug('waitForNextVeriffVerification() this.handleVerificationUpdate(message)');
                    // resolves after the verification update is handled first time
                    await this.handleVerificationUpdate(message);

                    debug('waitForNextVeriffVerification() this.handleVerificationUpdate(message) resolved');

                    if (!id) throw new Error('Failed to subscribe to Veriff verification messages');
                    this.unsubscribeVeriffVerification(id);
                    const res = ((await this.fetchVerificationData(VerificationTypeEnum.KYC)) as KYCVC).getPayload();

                    debug('waitForNextVeriffVerification() resolved with', res);
                    resolve(res);
                } catch (error) {
                    reject(error);
                }
            };

            id = this.subscribeVeriffVerification(newHandler);
        });
    }

    async fetchVerificationData(type: VerificationTypeEnum): Promise<PersonCredentialType> {
        debug('fetchVerificationData()', type);
        const vc = await this.idVerificationManager.findLatestApproved(type);

        if (!vc) {
            throw new Error(`${type} verification data requested but not available in storage`);
        }

        return vc;
    }
}
