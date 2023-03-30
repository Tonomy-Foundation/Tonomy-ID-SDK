/* eslint-disable camelcase */
import { Name, PublicKey } from '@greymass/eosio';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from './services/storage';
import { User } from './user';
import { createKeyManagerSigner } from './services/eosio/transaction';
import { SdkErrors, throwError } from './services/errors';
import { App, AppStatus } from './app';
import { Message } from './util/message';

const idContract = IDContract.Instance;

export type UserAppRecord = {
    app: App;
    added: Date;
    status: AppStatus;
};

export type UserAppStorage = {
    appRecords: UserAppRecord[];
};

// TODO change to use VC
export type JWTLoginPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};

export type OnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
};

export class UserApps {
    user: User;
    keyManager: KeyManager;
    storage: UserAppStorage & PersistentStorageClean;

    constructor(_user: User, _keyManager: KeyManager, storageFactory: StorageFactory) {
        this.user = _user;
        this.keyManager = _keyManager;
        this.storage = createStorage<UserAppStorage>(STORAGE_NAMESPACE + 'user.apps.', storageFactory);
    }

    async loginWithApp(app: App, key: PublicKey): Promise<void> {
        const myAccount = await this.user.storage.accountName;

        const appRecord: UserAppRecord = {
            app,
            added: new Date(),
            status: AppStatus.PENDING,
        };

        let apps = await this.storage.appRecords;

        if (!apps) {
            apps = [];
        }

        apps.push(appRecord);
        this.storage.appRecords = apps;
        await this.storage.appRecords;

        const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.LOCAL);

        await idContract.loginwithapp(myAccount.toString(), app.accountName.toString(), 'local', key, signer);

        appRecord.status = AppStatus.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    /**
     * Verifies the login request are valid requests signed by valid DIDs
     *
     * @param requests {string | null} - a stringified array of JWTs
     * @returns {Promise<Message[]>} - an array of verified messages containing the login requests
     */
    static async verifyRequests(requests: string | null): Promise<Message[]> {
        if (!requests) throwError('No requests found in URL', SdkErrors.MissingParams);

        const jwtRequests = JSON.parse(requests);

        if (!jwtRequests || !Array.isArray(jwtRequests) || jwtRequests.length === 0) {
            throwError('No JWTs found in URL', SdkErrors.MissingParams);
        }

        const verified: Message[] = [];

        for (const jwt of jwtRequests) {
            verified.push(await this.verifyLoginJWT(jwt));
        }

        return verified;
    }

    /**
     * Extracts the login requests, username and accountName from the URL
     *
     * @returns the requests (JWTs), username and accountName
     */
    static getLoginRequestParams(): { requests: string; username: string; accountName: string } {
        const params = new URLSearchParams(window.location.search);

        const requests = params.get('requests');

        if (!requests) throwError("requests parameter doesn't exists", SdkErrors.MissingParams);

        const username = params.get('username');

        if (!username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);

        const accountName = params.get('accountName');

        if (!accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);

        return { requests, username, accountName };
    }

    /**
     * Verifies the login request received in the URL were successfully authorized by Tonomy ID
     *
     * @description should be called in the callback page of the SSO Login website
     *
     * @returns {Promise<Message>} - the verified login request
     */
    static async onRedirectLogin(): Promise<Message> {
        const urlParams = new URLSearchParams(window.location.search);
        const requests = urlParams.get('requests');

        const verifiedRequests = await UserApps.verifyRequests(requests);

        const referrer = new URL(document.referrer);

        for (const message of verifiedRequests) {
            if (message.getPayload().origin === referrer.origin) {
                return message;
            }
        }

        throwError(
            `No origins from: ${verifiedRequests.map((r) => r.getPayload().origin)} match referrer: ${referrer.origin}`,
            SdkErrors.WrongOrigin
        );
    }

    /**
     * Checks that a key exists in the key manager that has been authorized on the DID
     *
     * @description This is called on the callback page to verify that the user has logged in correctly
     *
     * @param accountName {string} - the account name to check the key on
     * @param keyManager {KeyManager} - the key manager to check the key in
     * @param keyManagerLevel {KeyManagerLevel=BROWSER_LOCAL_STORAGE} - the level to check the key in
     * @returns {Promise<boolean>} - true if the key exists and is authorized, false otherwise
     */
    static async verifyKeyExistsForApp(
        accountName: string,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ): Promise<boolean> {
        const pubKey = await keyManager.getKey({
            level: keyManagerLevel,
        });

        if (!pubKey) throw throwError('key not found', SdkErrors.KeyNotFound);
        const account = await User.getAccountInfo(Name.from(accountName));

        if (!account) throwError("couldn't fetch account", SdkErrors.AccountNotFound);
        const app = await App.getApp(window.location.origin);

        const publickey = account.getPermission(app.accountName).required_auth.keys[0].key;

        return pubKey.toString() === publickey.toString();
    }

    /**
     * Verifies a jwt string is a valid message with signature from a DID
     * @param jwt {string} - the jwt string to verify
     * @returns {Promise<Message>} - the verified message
     */
    static async verifyLoginJWT(jwt: string): Promise<Message> {
        const message = new Message(jwt);
        const res = await message.verify();

        // TODO should check the keys in KeyManager are on the blockchain...

        if (!res) throwError('JWT failed verification', SdkErrors.JwtNotValid);
        return message;
    }
}
