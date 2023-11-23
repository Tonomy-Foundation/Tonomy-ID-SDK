import { Name } from '@wharfkit/antelope';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { SdkErrors, throwError } from '../util/errors';
import { TonomyUsername } from '../util/username';
import { Communication } from '../services/communication/communication';
import { Issuer } from '@tonomy/did-jwt-vc';
import { createVCSigner } from '../util/crypto';
import { UserStatusEnum } from '../types/UserStatusEnum';
import { AbstractUserBase, IUserBase, IUserStorage } from '../types/User';

export class UserBase extends AbstractUserBase implements IUserBase {
    protected keyManager: KeyManager;
    protected storage: IUserStorage & PersistentStorageClean;
    communication: Communication;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        super();
        this.keyManager = _keyManager;
        this.storage = createStorage<IUserStorage>(STORAGE_NAMESPACE + 'user.', storageFactory);

        //TODO implement dependency inversion
        this.communication = new Communication(false);
    }

    async getStatus(): Promise<UserStatusEnum> {
        return await this.storage.status;
    }

    async getAccountName(): Promise<Name> {
        return await this.storage.accountName;
    }

    async getUsername(): Promise<TonomyUsername> {
        const storage = await this.storage.username;

        if (!storage) throwError('Username not set', SdkErrors.InvalidData);
        else if (storage instanceof TonomyUsername) {
            return storage;
        } else if (typeof storage === 'string') {
            return new TonomyUsername(storage);
        } else {
            throwError('Username not in expected format', SdkErrors.InvalidData);
        }
    }

    async getDid(): Promise<string> {
        return await this.storage.did;
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
}
