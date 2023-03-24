import { Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { PushTransactionResponse } from '@greymass/eosio/src/api/v1/types';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { GetPersonResponse, IDContract } from './services/contracts/IDContract';
import { AntelopePushTransactionError, createKeyManagerSigner, createSigner } from './services/eosio/transaction';
import { getApi, getChainInfo } from './services/eosio/eosio';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { SdkErrors, throwError, SdkError } from './services/errors';
import { AccountType, TonomyUsername } from './services/username';
import { validatePassword } from './util/passwords';
import { UserApps } from './userApps';
import { getSettings } from './settings';
import { Communication } from './communication';
import { Message } from './util/message';
import { Issuer } from '@tonomy/did-jwt-vc';
import { createVCSigner } from './util/crypto';

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
        this.storage = createStorage<UserStorage>('tonomy.user.', storageFactory);

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
        return await this.storage.username;
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

    async savePassword(masterPassword: string, options?: { salt?: Checksum256 }) {
        const password = validatePassword(masterPassword);

        let privateKey: PrivateKey;
        let salt: Checksum256;

        if (options && options.salt) {
            salt = options.salt;
            const res = await this.keyManager.generatePrivateKeyFromPassword(password, salt);

            privateKey = res.privateKey;
        } else {
            const res = await this.keyManager.generatePrivateKeyFromPassword(password);

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
        const privateKey = this.keyManager.generateRandomPrivateKey();

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PIN,
            privateKey,
            challenge: pin,
        });
    }

    async checkPin(pin: string): Promise<boolean> {
        const username = await this.getAccountName();

        const idData = await idContract.getPerson(username);

        const pinKey = await this.keyManager.getKey({
            level: KeyManagerLevel.PIN,
        });

        // console.log('Pin Key', pinKey?.toString());
        // console.log('Pin Key data', pinKey?.data);

        console.log('pin', pin);
        const accountData = await User.getAccountInfo(idData.account_name);
        // get pin Pin now and match with given Pin key

        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key;
        // TODO change to active/other permissions when we make the change

        // console.log('all keys', JSON.stringify(accountData.getPermission('owner').required_auth.keys));
        if (!pinKey) throwError('Pin key not found', SdkErrors.KeyNotFound);

        if (pinKey.toString() !== onchainKey.toString()) throwError('Pin is incorrect', SdkErrors.PinInValid);
        return true;
    }

    async saveFingerprint() {
        const privateKey = this.keyManager.generateRandomPrivateKey();

        await this.keyManager.storeKey({
            level: KeyManagerLevel.FINGERPRINT,
            privateKey,
        });
    }

    async saveLocal() {
        const privateKey = this.keyManager.generateRandomPrivateKey();

        await this.keyManager.storeKey({
            level: KeyManagerLevel.LOCAL,
            privateKey,
        });
    }

    async createPerson(): Promise<PushTransactionResponse> {
        const { keyManager } = this;
        const username = await this.storage.username;

        const usernameHash = username.usernameHash;

        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        if (!passwordKey) throwError('Password key not found', SdkErrors.KeyNotFound);

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
            throw new Error("Can't update keys ");
        }

        const { keyManager } = this;

        const pinKey = await keyManager.getKey({ level: KeyManagerLevel.PIN });
        const fingerprintKey = await keyManager.getKey({
            level: KeyManagerLevel.FINGERPRINT,
        });
        const localKey = await keyManager.getKey({ level: KeyManagerLevel.LOCAL });

        // TODO:
        // use status in smart contract to lock the account till finished creating
        interface KeyInterface {
            PIN: string;
            FINGERPRINT: string;
            LOCAL: string;
        }

        const keys = {} as KeyInterface;

        if (pinKey) keys.PIN = pinKey.toString();
        if (fingerprintKey) keys.FINGERPRINT = fingerprintKey.toString();
        if (localKey) keys.LOCAL = localKey.toString();

        const signer = createKeyManagerSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        const accountName = await this.storage.accountName;

        await idContract.updatekeysper(accountName.toString(), keys, signer);
        this.storage.status = UserStatus.READY;
        await this.storage.status;
    }

    async checkPassword(password: string): Promise<boolean> {
        const username = await this.getAccountName();

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { salt });
        const passwordKey = await this.keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await User.getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (!passwordKey) throwError('Password key not found', SdkErrors.KeyNotFound);

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInValid);

        return true;
    }

    async login(username: TonomyUsername, password: string): Promise<GetPersonResponse> {
        const { keyManager } = this;

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { salt });
        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        if (!passwordKey) throwError('Password key not found', SdkErrors.KeyNotFound);

        const accountData = await User.getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInValid);

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
                level: KeyManagerLevel.FINGERPRINT,
                permission: 'fingerprint',
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
        await this.keyManager.removeKey({ level: KeyManagerLevel.FINGERPRINT });
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

    async signMessage(payload: any, recipient?: string): Promise<Message> {
        const signer = createVCSigner(this.keyManager, KeyManagerLevel.LOCAL);

        const issuer: Issuer = {
            did: (await this.getDid()) + '#local',
            signer: signer.sign as any,
            alg: 'ES256K-R',
        };

        return await Message.sign(payload, issuer, recipient);
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
