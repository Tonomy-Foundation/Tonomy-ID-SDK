import { DataSource } from 'typeorm';
import { VerificationMessage } from '../services/communication/message';
import { UserCommunication } from './UserCommunication';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { VeriffSubscriber } from '../services/communication/communication';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { IdentityVerificationStorageManager } from '../storage/identityVerificationStorageManager';
import { verifyOpsTmyDid } from '../util/ssi/did';
import {
    castDecisionToStatus,
    castStringToCredential,
    KYCPayload,
    KYCVC,
    PersonCredentialType,
    SdkErrors,
    throwError,
} from '../util';
import { IUserDataVault } from '../types/User';
import Debug from 'debug';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { IdentityVerificationStorageRepository } from '../storage/identityVerificationStorageRepository';

const debug = Debug('tonomy-sdk:controllers:UserDataVault');

export class UserDataVault extends UserCommunication implements IUserDataVault {
    protected readonly idVerificationManager: IdentityVerificationStorageManager;
    protected readonly dataSource: DataSource;

    constructor(keyManager: KeyManager, storageFactory: StorageFactory, dataSource: DataSource) {
        super(keyManager, storageFactory);
        this.dataSource = dataSource;
        const repository = new IdentityVerificationStorageRepository(dataSource);

        this.idVerificationManager = new IdentityVerificationStorageManager(repository);
    }

    async checkTableExists(tableName: string) {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            const result = await queryRunner.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [
                tableName,
            ]);

            debug(`Table check result for ${tableName}:`, result);
            return result.length > 0;
        } finally {
            await queryRunner.release();
        }
    }

    async initializeKycDataSource(): Promise<void> {
        if (this.dataSource && !this.dataSource.isInitialized) {
            await this.dataSource.initialize();
        }

        const identityVerificationTableExists = await this.checkTableExists('IdentityVerificationStorage');

        if (!identityVerificationTableExists) {
            await this.dataSource.synchronize();
        }
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

        debug('handleVerificationUpdate() kycPayload', did, kycPayload, vcPayload);

        for (const [key, signedVc] of Object.entries(vcPayload)) {
            const type = VerificationTypeEnum.from(key);

            const vc = castStringToCredential(signedVc.toString(), type);

            await this.idVerificationManager.emplaceByVeriffIdAndType(kycPayload.sessionId + key, type, status, vc);
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
        debug('waitForNextVeriffVerification');
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

    async fetchVerificationData(
        type: VerificationTypeEnum,
        status: VeriffStatusEnum = VeriffStatusEnum.APPROVED
    ): Promise<PersonCredentialType> {
        debug('fetchVerificationData()', type, status);
        const vc = await this.idVerificationManager.findLatestWithTypeAndStatus(type, status);

        if (!vc) {
            throwError(
                `${type} verification data with status ${status} requested but not available in storage`,
                SdkErrors.VerificationDataNotFound
            );
        }

        return vc;
    }

    async fetchReuseableKycCount(type?: VerificationTypeEnum): Promise<number> {
        const count = await this.idVerificationManager.countReuseableLogin(type);

        return count;
    }
}
