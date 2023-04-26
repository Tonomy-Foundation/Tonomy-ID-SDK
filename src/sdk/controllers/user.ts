import { Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { PushTransactionResponse } from '@greymass/eosio/src/api/v1/types';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { GetPersonResponse, IDContract } from '../services/blockchain/contracts/IDContract';
import {
    AntelopePushTransactionError,
    createKeyManagerSigner,
    createSigner,
} from '../services/blockchain/eosio/transaction';
import { getApi, getChainInfo } from '../services/blockchain/eosio/eosio';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { SdkErrors, throwError, SdkError } from '../util/errors';
import { AccountType, TonomyUsername } from '../util/username';
import { validatePassword } from '../util/passwords';
import { UserApps } from './userApps';
import { getSettings } from '../util/settings';
import { Communication } from '../services/communication/communication';
import { Issuer } from '@tonomy/did-jwt-vc';
import { createVCSigner, generateRandomKeyPair } from '../util/crypto';

enum UserStatus {
    CREATING_ACCOUNT = 'CREATING_ACCOUNT',
    LOGGING_IN = 'LOGGING_IN',
    READY = 'READY',
    DEACTIVATED = 'DEACTIVATED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace UserStatus {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: UserStatus): number {
        return Object.keys(UserStatus).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): UserStatus {
        let index: number;

        if (typeof value !== 'number') {
            index = UserStatus.indexFor(value as UserStatus);
        } else {
            index = value;
        }

        return Object.values(UserStatus)[index] as UserStatus;
    }
}

export { UserStatus };

type KeyFromPasswordFn = (
    password: string,
    salt?: Checksum256
) => Promise<{ privateKey: PrivateKey; salt: Checksum256 }>;

export type UserStorage = {
    status: UserStatus;
    accountName: Name;
    username: TonomyUsername;
    salt: Checksum256;
    did: string;
    // TODO update to have all data from blockchain
};

const idContract = IDContract.Instance;

export class User {
    private chainID!: Checksum256;
    keyManager: KeyManager;
    storage: UserStorage & PersistentStorageClean;
    apps: UserApps;
    communication: Communication;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<UserStorage>(STORAGE_NAMESPACE + 'user.', storageFactory);

        this.apps = new UserApps(this, _keyManager, storageFactory);

        //TODO implement dependency inversion
        this.communication = new Communication();
    }

    async getStatus(): Promise<UserStatus> {
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

    async saveUsername(username: string) {
        const normalizedUsername = username.normalize('NFKC');

        let user: API.v1.AccountObject;
        const fullUsername = TonomyUsername.fromUsername(
            normalizedUsername,
            AccountType.PERSON,
            getSettings().accountSuffix
        );

        try {
            user = (await User.getAccountInfo(fullUsername)) as any; // Throws error if username is taken
            if (user) throwError('Username is taken', SdkErrors.UsernameTaken);
        } catch (e) {
            if (!(e instanceof SdkError && e.code === SdkErrors.UsernameNotFound)) {
                throw e;
            }
        }

        this.storage.username = fullUsername;
        await this.storage.username;
    }

    /**
     * Check if a username already exists
     * @param {string} username - a string param that represents the username
     * @returns {boolean} true if username already exists and false if doesn't exists
     */
    async usernameExists(username: string): Promise<boolean> {
        const normalizedUsername = username.normalize('NFKC');

        const fullUsername = TonomyUsername.fromUsername(
            normalizedUsername,
            AccountType.PERSON,
            getSettings().accountSuffix
        );

        try {
            await User.getAccountInfo(fullUsername);
            return true;
        } catch (e) {
            if (e instanceof SdkError && e.code === SdkErrors.UsernameNotFound) {
                return false;
            }

            throw e;
        }
    }

    async savePassword(
        masterPassword: string,
        options: {
            keyFromPasswordFn: KeyFromPasswordFn;
            salt?: Checksum256;
        }
    ) {
        const password = validatePassword(masterPassword);

        let privateKey: PrivateKey;
        let salt: Checksum256;

        if (options.salt) {
            salt = options.salt;
            const res = await options.keyFromPasswordFn(password, salt);

            privateKey = res.privateKey;
        } else {
            const res = await options.keyFromPasswordFn(password);

            privateKey = res.privateKey;
            salt = res.salt;
        }

        this.storage.salt = salt;
        await this.storage.salt; // wait for magic setter on storage

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PASSWORD,
            privateKey,
            challenge: password,
        });
    }

    async savePIN(pin: string) {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PIN,
            privateKey,
            challenge: pin,
        });
    }

    async checkPin(pin: string): Promise<boolean> {
        const pinKey = await this.keyManager.checkKey({
            level: KeyManagerLevel.PIN,
            challenge: pin,
        });

        if (!pinKey) throwError('Pin is incorrect', SdkErrors.PinInvalid);
        return true;
    }

    async saveFingerprint() {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.BIOMETRIC,
            privateKey,
        });
    }

    async saveLocal() {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.LOCAL,
            privateKey,
        });
    }

    async createPerson(): Promise<PushTransactionResponse> {
        const { keyManager } = this;
        const username = await this.getUsername();

        const usernameHash = username.usernameHash;

        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        // TODO this needs to change to the actual key used, from settings
        const idTonomyActiveKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');

        const salt = await this.storage.salt;
        let res: PushTransactionResponse;

        try {
            res = await idContract.newperson(
                usernameHash.toString(),
                passwordKey.toString(),
                salt.toString(),
                createSigner(idTonomyActiveKey)
            );
        } catch (e) {
            if (e instanceof AntelopePushTransactionError) {
                if (e.hasErrorCode(3050003) && e.hasTonomyErrorCode('TCON1000')) {
                    throw throwError('Username is taken', SdkErrors.UsernameTaken);
                }
            }

            throw e;
        }

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        this.storage.accountName = Name.from(newAccountAction.data.name);
        await this.storage.accountName;

        this.storage.status = UserStatus.CREATING_ACCOUNT;
        await this.storage.status;
        await this.createDid();

        return res;
    }

    async updateKeys(password: string) {
        const status = await this.getStatus();

        if (status === UserStatus.DEACTIVATED) {
            throwError("Can't update keys for deactivated user", SdkErrors.UserDeactivated);
        }

        const { keyManager } = this;

        // TODO:
        // use status in smart contract to lock the account till finished creating
        const keys = {} as {
            PIN: string;
            BIOMETRIC: string;
            LOCAL: string;
        };

        try {
            const pinKey = await keyManager.getKey({ level: KeyManagerLevel.PIN });

            keys.PIN = pinKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        try {
            const biometricKey = await keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC });

            keys.BIOMETRIC = biometricKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        try {
            const localKey = await keyManager.getKey({ level: KeyManagerLevel.LOCAL });

            keys.LOCAL = localKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        const signer = createKeyManagerSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        const accountName = await this.storage.accountName;

        await idContract.updatekeysper(accountName.toString(), keys, signer);
        this.storage.status = UserStatus.READY;
        await this.storage.status;
    }

    async checkPassword(
        password: string,
        options: {
            keyFromPasswordFn: KeyFromPasswordFn;
        }
    ): Promise<boolean> {
        const username = await this.getAccountName();

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await this.keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await User.getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        return true;
    }

    async login(
        username: TonomyUsername,
        password: string,
        options: {
            keyFromPasswordFn: KeyFromPasswordFn;
        }
    ): Promise<GetPersonResponse> {
        const { keyManager } = this;

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await User.getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        this.storage.accountName = Name.from(idData.account_name);
        this.storage.username = username;
        this.storage.status = UserStatus.LOGGING_IN;

        await this.storage.accountName;
        await this.storage.username;
        await this.storage.status;
        await this.createDid();

        return idData;
    }

    async checkKeysStillValid(): Promise<boolean> {
        // Account been created, or has not finished being created yet
        if (this.storage.status !== UserStatus.READY) throwError('User is not ready', SdkErrors.AccountDoesntExist);

        const accountInfo = await User.getAccountInfo(await this.storage.accountName);

        const checkPairs = [
            {
                level: KeyManagerLevel.PIN,
                permission: 'pin',
            },
            {
                level: KeyManagerLevel.BIOMETRIC,
                permission: 'biometric',
            },
            {
                level: KeyManagerLevel.LOCAL,
                permission: 'local',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'active',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'owner',
            },
        ];

        for (const pair of checkPairs) {
            let localKey;

            try {
                localKey = await this.keyManager.getKey({ level: pair.level });
            } catch (e) {
                localKey = null;
            }

            let blockchainPermission;

            try {
                blockchainPermission = accountInfo.getPermission(pair.permission);
            } catch (e) {
                blockchainPermission = null;
            }

            if (!localKey && blockchainPermission) {
                // User probably logged into another device and finished create account flow there
                throwError(
                    `${pair.level} key was not found in the keyManager, but was found on the blockchain`,
                    SdkErrors.KeyNotFound
                );
            }

            if (localKey && !blockchainPermission) {
                // User probably hasn't finished create account flow yet
                throwError(
                    `${pair.level} keys was not found on the blockchain, but was found in the keyManager`,
                    SdkErrors.KeyNotFound
                );
            }

            if (
                localKey &&
                blockchainPermission &&
                localKey.toString() !== blockchainPermission.required_auth.keys[0].key.toString()
            ) {
                // User has logged in on another device
                throwError(`${pair.level} keys do not match`, SdkErrors.KeyNotFound);
            }
        }

        return true;
    }

    async logout(): Promise<void> {
        // remove all keys
        await this.keyManager.removeKey({ level: KeyManagerLevel.PASSWORD });
        await this.keyManager.removeKey({ level: KeyManagerLevel.PIN });
        await this.keyManager.removeKey({ level: KeyManagerLevel.BIOMETRIC });
        await this.keyManager.removeKey({ level: KeyManagerLevel.LOCAL });
        // clear storage data
        this.storage.clear();

        this.communication.disconnect();
    }

    async isLoggedIn(): Promise<boolean> {
        return (await this.getStatus()) === UserStatus.READY;
    }

    static async getAccountInfo(account: TonomyUsername | Name): Promise<API.v1.AccountObject> {
        try {
            let accountName: Name;
            const api = await getApi();

            if (account instanceof TonomyUsername) {
                const idData = await idContract.getPerson(account);

                accountName = idData.account_name;
            } else {
                accountName = account;
            }

            return await api.v1.chain.get_account(accountName);
        } catch (e) {
            const error = e as Error;

            if (error.message === 'Account not found at /v1/chain/get_account') {
                throwError('Account "' + account.toString() + '" not found', SdkErrors.AccountDoesntExist);
            } else {
                throw e;
            }
        }
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

    /**
     * Generate did in storage
     * @return {string} did string
     */
    async createDid(): Promise<string> {
        if (!this.chainID) {
            this.chainID = (await getChainInfo()).chain_id as unknown as Checksum256;
        }

        const accountName = await this.storage.accountName;

        this.storage.did = `did:antelope:${this.chainID}:${accountName.toString()}`;
        await this.storage.did;
        return this.storage.did;
    }

    async intializeFromStorage() {
        const accountName = await this.getAccountName();

        if (accountName) {
            return await this.checkKeysStillValid();
        } else {
            throwError('Account "' + accountName + '" not found', SdkErrors.AccountDoesntExist);
        }
    }
}

/**
 * Initialize and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
export function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): User {
    return new User(keyManager, storageFactory);
}
