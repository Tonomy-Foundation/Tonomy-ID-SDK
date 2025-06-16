import { Name, NameType } from '@wharfkit/antelope';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { SdkErrors, throwError } from '../util/errors';
import { TonomyUsername } from '../util/username';
import { Issuer } from 'did-jwt-vc';
import { createVCSigner } from '../util/crypto';
import { UserStatusEnum } from '../types/UserStatusEnum';
import { IUserBase, IUserStorage } from '../types/User';
import { createKeyManagerSigner, Signer } from '../services/blockchain';
import { UserDataVault } from '../storage/dataVault/UserDataVault';
import { DataSource } from 'typeorm';
import { Communication } from '../services/communication/communication';

export class UserBase implements IUserBase {
    protected keyManager: KeyManager;
    protected storage: IUserStorage & PersistentStorageClean;
    public userDataVault: UserDataVault;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<IUserStorage>(STORAGE_NAMESPACE + 'user.', storageFactory);
    }

    /**
     * Initialize the UserDataVault with the provided DataSource and Communication
     * @param dataSource TypeORM DataSource for database access
     * @param communication Communication instance for verification messages
     */
    async initializeDataVault(dataSource: DataSource, communication: Communication): Promise<void> {
        const [did, status] = await Promise.all([
            this.getDid(),
            this.storage.status
        ]);

        if (status !== UserStatusEnum.READY) {
            throw new Error('User is not ready');
        }
        
        this.userDataVault = new UserDataVault(dataSource, communication, did);
    }

    /**
     * Get the UserDataVault instance
     * @returns the UserDataVault instance
     * @throws Error if UserDataVault is not initialized
     */
    getUserDataVault(): UserDataVault {
        if (!this.userDataVault) {
            throw new Error('UserDataVault is not initialized. Call initializeDataVault first.');
        }
        return this.userDataVault;
    }

    async getStatus(): Promise<UserStatusEnum> {
        return await this.storage.status;
    }

    async getAccountName(): Promise<Name> {
        return await this.storage.accountName;
    }

    async getUsername(): Promise<TonomyUsername> {
        const username = await this.storage.username;

        if (!username) throwError('Username not set', SdkErrors.InvalidData);
        else if (username instanceof TonomyUsername) {
            return username;
        } else if (typeof username === 'string') {
            return new TonomyUsername(username);
        } else {
            throwError('Username not in expected format', SdkErrors.InvalidData);
        }
    }

    async getDid(appName?: NameType): Promise<string> {
        return (await this.storage.did) + (appName ? `#${appName}` : '');
    }

    async getIssuer(): Promise<Issuer> {
        const did = await this.getDid();
        const signer = createVCSigner(this.keyManager, KeyManagerLevel.LOCAL);

        return {
            did: did + '#local',
            signer: signer.sign as any,
            alg: 'ES256K-R',
        };
    }

    async getSigner(level: KeyManagerLevel): Promise<Signer> {
        return createKeyManagerSigner(this.keyManager, level);
    }
}
