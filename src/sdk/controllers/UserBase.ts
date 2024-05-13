import { Name, PublicKey } from '@wharfkit/antelope';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { SdkErrors, throwError } from '../util/errors';
import { TonomyUsername } from '../util/username';
import { Issuer } from '@tonomy/did-jwt-vc';
import { createVCSigner } from '../util/crypto';
import { UserStatusEnum } from '../types/UserStatusEnum';
import { IUserBase, IUserStorage } from '../types/User';

export class UserBase implements IUserBase {
    protected keyManager: KeyManager;
    protected storage: IUserStorage & PersistentStorageClean;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<IUserStorage>(STORAGE_NAMESPACE + 'user.', storageFactory);
    }

    async getStatus(): Promise<UserStatusEnum> {
        return await this.storage.status;
    }

    async getAccountName(): Promise<Name> {
        return await this.storage.accountName;
    }

    async getEthereumKey(): Promise<PublicKey> {
        const publicKey = await this.keyManager.getKey({ level: KeyManagerLevel.ETHEREUM_KEY });

        return publicKey;
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
