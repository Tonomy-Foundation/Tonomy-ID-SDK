import { Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { PushTransactionResponse } from '@greymass/eosio/src/api/v1/types';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { GetPersonResponse, IDContract } from './services/contracts/IDContract';
import { AntelopePushTransactionError, createKeyManagerSigner, createSigner } from './services/eosio/transaction';
import { getApi } from './services/eosio/eosio';
import { PersistentStorage } from './services/storage';
import { SdkErrors, throwError, SdkError } from './services/errors';
import { AccountType, TonomyUsername } from './services/username';
import { validatePassword } from './util/passwords';
import App from './app';

enum UserStatus {
    CREATING = 'CREATING',
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
};

const idContract = IDContract.Instance;

export class User {
    keyManager: KeyManager;
    storage: PersistentStorage & UserStorage;
    app: App;

    constructor(_keyManager: KeyManager, _storage: PersistentStorage) {
        this.keyManager = _keyManager;
        this.storage = _storage as PersistentStorage & UserStorage;
        this.app = new App(_keyManager, _storage);
    }

    async saveUsername(username: string, suffix: string) {
        const normalizedUsername = username.normalize('NFKC');

        let user: API.v1.AccountObject;
        const fullUsername = new TonomyUsername(normalizedUsername, AccountType.PERSON, suffix);
        try {
            user = await User.getAccountInfo(fullUsername); // Throws error if username is taken
        } catch (e) {
            if (!(e instanceof SdkError && e.code === SdkErrors.UsernameNotFound)) {
                throw e;
            }
        }
        if (user) throwError('Username is taken', SdkErrors.UsernameTaken);

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

        this.storage.status = UserStatus.CREATING;
        await this.storage.status;

        return res;
    }

    async updateKeys(password: string) {
        if ((await this.storage.status) !== UserStatus.CREATING) throw new Error("Can't update keys if not creating");

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
        if (!passwordKey.equals(onchainKey)) throw new Error('Password is incorrect');

        this.storage.accountName = Name.from(idData.account_name);
        this.storage.username = username;
        this.storage.status = UserStatus.READY;

        return idData;
    }

    async logout(): Promise<void> {
        // remove all keys
        await this.keyManager.removeKey({ level: KeyManagerLevel.PASSWORD });
        await this.keyManager.removeKey({ level: KeyManagerLevel.PIN });
        await this.keyManager.removeKey({ level: KeyManagerLevel.FINGERPRINT });
        await this.keyManager.removeKey({ level: KeyManagerLevel.LOCAL });
        // clear storage data
        this.storage.clear();
    }

    async isLoggedIn(): Promise<boolean> {
        return !!(await this.storage.status);
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
}
