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
import { LoginRequestResponseMessage, LoginRequestsMessagePayload } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { base64UrlToObj, objToBase64Url } from '../util/base64';
import { getSettings } from '../util/settings';
import { DID, URL as URLtype } from '../util/ssi/types';
import { Issuer } from '@tonomy/did-jwt-vc';

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

    async acceptLoginRequest(
        requests: { request: LoginRequest; app: App }[],
        platform: 'mobile' | 'browser',
        messageRecipient?: DID
    ): Promise<void | URLtype> {
        const accountName = await this.user.getAccountName();
        const username = await this.user.getUsername();

        for (const loginRequest of requests) {
            const { app, request } = loginRequest;

            await this.user.apps.loginWithApp(app, request.getPayload().publicKey);
        }

        const responsePayload = {
            success: true,
            requests: requests.map((loginRequest) => loginRequest.request),
            accountName,
            username,
        };

        if (platform === 'mobile') {
            let callbackUrl = getSettings().ssoWebsiteOrigin + '/callback?';

            callbackUrl += 'payload=' + objToBase64Url(responsePayload);

            return callbackUrl;
        } else {
            if (!messageRecipient) throwError('Missing message recipient', SdkErrors.MissingParams);
            const issuer = await this.user.getIssuer();
            const message = await LoginRequestResponseMessage.signMessage(responsePayload, issuer, messageRecipient);

            await this.user.communication.sendMessage(message);
        }
    }

    static async terminateLoginRequest(
        loginRequests: LoginRequest[],
        returnType: 'url' | 'message',
        error: {
            code: SdkErrors;
            reason: string;
        },
        options: {
            callbackOrigin?: string;
            callbackPath?: URLtype;
            issuer?: Issuer;
            messageRecipient?: DID;
        }
    ): Promise<LoginRequestResponseMessage | URLtype> {
        const responsePayload = {
            success: false,
            requests: loginRequests,
            error,
        };

        if (returnType === 'url') {
            if (!options.callbackOrigin || !options.callbackPath)
                throwError('Missing callback origin or path', SdkErrors.MissingParams);
            let callbackUrl = options.callbackOrigin + options.callbackPath + '?';

            callbackUrl += 'payload=' + objToBase64Url(responsePayload);

            return callbackUrl;
        } else {
            if (!options.messageRecipient || !options.issuer)
                throwError('Missing message recipient or issuer', SdkErrors.MissingParams);
            return await LoginRequestResponseMessage.signMessage(
                responsePayload,
                options.issuer,
                options.messageRecipient
            );
        }
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
     * @returns {LoginRequestsMessagePayload} the requests, username and accountName
     */
    static getLoginRequestFromUrl(): LoginRequestsMessagePayload {
        const params = new URLSearchParams(window.location.search);

        const base64UrlPayload = params.get('payload');

        if (!base64UrlPayload) throwError("payload parameter doesn't exists", SdkErrors.MissingParams);

        const parsedPayload = base64UrlToObj(base64UrlPayload);

        if (!parsedPayload || !parsedPayload.requests)
            throwError('No requests found in payload', SdkErrors.MissingParams);

        const loginRequests = parsedPayload.requests.map((r: string) => new LoginRequest(r));

        return { requests: loginRequests };
    }

    /**
     * Extracts the login requests, username and accountName from the URL
     *
     * @returns {LoginRequestResponseMessagePayload} the requests, username and accountName
     */
    static getLoginRequestResponseFromUrl(): LoginRequestResponseMessagePayload {
        const params = new URLSearchParams(window.location.search);

        const base64UrlPayload = params.get('payload');

        if (!base64UrlPayload) throwError("payload parameter doesn't exists", SdkErrors.MissingParams);

        const parsedPayload = base64UrlToObj(base64UrlPayload);

        if (parsedPayload.success !== true && parsedPayload.success !== false)
            throwError("success parameter doesn't exists", SdkErrors.MissingParams);

        const { requests } = this.getLoginRequestFromUrl();

        if (parsedPayload.success) {
            if (!parsedPayload.username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);
            if (!parsedPayload.accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
            return {
                success: true,
                requests,
                username: new TonomyUsername(parsedPayload.username),
                accountName: Name.from(parsedPayload.accountName),
            };
        } else {
            if (!parsedPayload.error) throwError("error parameter doesn't exists", SdkErrors.MissingParams);
            return { success: false, requests, error: parsedPayload.error };
        }
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

        if (!myRequest) {
            const msg =
                `No origins from: ${verifiedRequests.map((r) => r.getPayload().origin)} ` +
                `match referrer: ${referrer.origin}`;

            throwError(msg, SdkErrors.WrongOrigin);
        }

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
