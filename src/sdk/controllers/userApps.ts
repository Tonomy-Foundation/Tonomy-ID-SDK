/* eslint-disable camelcase */
import { Name, PublicKey } from '@greymass/eosio';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { User } from './user';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkErrors, throwError } from '../util/errors';
import { App, AppStatus } from './app';
import { TonomyUsername } from '../util/username';
import { LoginRequest } from '../util/request';

const idContract = IDContract.Instance;

export type UserAppRecord = {
    app: App;
    added: Date;
    status: AppStatus;
};

export type UserAppStorage = {
    appRecords: UserAppRecord[];
};

export type OnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
};

export type ResponseParams = {
    success: boolean;
    reason: SdkErrors;
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
     * @param {LoginRequest[]} requests - an array of login requests
     * @returns {Promise<LoginRequest[]>} - an array of verified login requests
     */
    static async verifyRequests(requests: LoginRequest[]): Promise<LoginRequest[]> {
        for (const request of requests) {
            if (!(await request.verify()))
                throwError(`Invalid request for ${request.getPayload().origin}`, SdkErrors.JwtNotValid);
        }

        return requests;
    }

    /**
     * Extracts the login requests from the URL
     *
     * @returns { requests: LoginRequest[] } the requests, username and accountName
     */
    static getLoginRequestFromUrl(): { requests: LoginRequest[] } {
        const params = new URLSearchParams(window.location.search);

        const requests = params.get('requests');

        if (!requests) throwError("requests parameter doesn't exists", SdkErrors.MissingParams);
        const jwtRequests = JSON.parse(requests) as string[];

        if (!jwtRequests || !Array.isArray(jwtRequests) || jwtRequests.length === 0) {
            throwError('No JWTs found in URL', SdkErrors.MissingParams);
        }

        const loginRequests = jwtRequests.map((r: string) => new LoginRequest(r));

        return { requests: loginRequests };
    }

    /**
     * Extracts the login requests, username and accountName from the URL
     *
     * @returns { requests: LoginRequest[]; username: TonomyUsername; accountName: Name } the requests, username and accountName
     */
    static getLoginRequestResponseFromUrl(): { requests: LoginRequest[]; username: TonomyUsername; accountName: Name } {
        const { requests } = this.getLoginRequestFromUrl();

        const params = new URLSearchParams(window.location.search);
        const username = params.get('username');
        const accountName = params.get('accountName');

        if (!username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);
        if (!accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);

        return { requests, username: new TonomyUsername(username), accountName: Name.from(accountName) };
    }

    /**
     * Verifies the login request received in the URL were successfully authorized by Tonomy ID
     *
     * @description should be called in the callback page of the SSO Login website
     *
     * @returns {Promise<LoginRequest>} - the verified login request
     */
    static async onRedirectLogin(): Promise<LoginRequest> {
        const { requests } = this.getLoginRequestFromUrl();

        const verifiedRequests = await UserApps.verifyRequests(requests);

        const referrer = new URL(document.referrer);

        const myRequest = verifiedRequests.find((r) => r.getPayload().origin === referrer.origin);

        if (!myRequest)
            throwError(
                `No origins from: ${verifiedRequests.map((r) => r.getPayload().origin)} match referrer: ${referrer.origin
                }`,
                SdkErrors.WrongOrigin
            );
        return myRequest;
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
        accountName: Name,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ): Promise<boolean> {
        const pubKey = await keyManager.getKey({
            level: keyManagerLevel,
        });

        const account = await User.getAccountInfo(accountName);

        if (!account) throwError("couldn't fetch account", SdkErrors.AccountNotFound);
        const app = await App.getApp(window.location.origin);

        const publickey = account.getPermission(app.accountName).required_auth.keys[0].key;

        return pubKey.toString() === publickey.toString();
    }
}
