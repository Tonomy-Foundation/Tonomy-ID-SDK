/* eslint-disable camelcase */
import { Name, PublicKey } from '@wharfkit/antelope';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { User } from './user';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkError, SdkErrors, throwError } from '../util/errors';
import { App, AppStatus } from './app';
import { TonomyUsername } from '../util/username';
import { LoginRequest, TonomyRequest } from '../util/request';
import { LoginRequestResponseMessage, LoginRequestsMessagePayload } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { base64UrlToObj, objToBase64Url } from '../util/base64';
import { getSettings } from '../util/settings';
import { DID, URL as URLtype } from '../util/ssi/types';
import { Issuer } from '@tonomy/did-jwt-vc';
import { ES256KSigner, JsKeyManager, createVCSigner, generateRandomKeyPair } from '..';
import { createJWK, toDid } from '../util/ssi/did-jwk';
import { DataSharingRequest } from '../util';

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
    dataRequest?: {
        username?: boolean;
    };
};

export type ResponseParams = {
    success: boolean;
    reason: SdkErrors;
};

export type CheckedRequest = {
    request: TonomyRequest;
    app: App;
    requiresLogin: boolean;
    ssoApp: boolean;
    requestDid?: string;
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

    /** Accepts a login request by authorizing keys on the blockchain (if the are not already authorized)
     * And sends a response to the requesting app
     *
     * @param {{request: LoginRequest, app: App, requiresLogin: boolean}[]} loginRequests - Array of requests to log into
     * @param {DataSharingRequest} [dataSharingRequest] - Data sharing request to accept
     * @param {'mobile' | 'browser'} platform - Platform of the request, either 'mobile' or 'browser'
     * @param {DID} messageRecipient - DID of the recipient of the message
     * @returns {Promise<void | URLtype>} the callback url if the platform is mobile, or undefined if it is browser
     */
    async acceptLoginRequest(
        loginRequests: { request: LoginRequest; app: App; requiresLogin?: boolean }[],
        dataSharingRequest: DataSharingRequest | undefined,
        platform: 'mobile' | 'browser',
        messageRecipient?: DID
    ): Promise<void | URLtype> {
        const accountName = await this.user.getAccountName();

        for (const loginRequest of loginRequests) {
            const { app, request, requiresLogin } = loginRequest;

            if (requiresLogin ?? true) {
                await this.user.apps.loginWithApp(app, request.getPayload().publicKey);
            }
        }

        const responsePayload: LoginRequestResponseMessagePayload = {
            success: true,
            requests: loginRequests.map((loginRequest) => loginRequest.request),
            accountName,
        };

        if (dataSharingRequest?.getPayload().username === true) {
            const username = await this.user.getUsername();

            responsePayload.username = username;
        }

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

    /** Verifies the login requests, and checks if the apps have already been authorized with those keys
     *
     * @param {LoginRequest[]} requests - Array of login requests to check
     * @returns {Promise<CheckedRequest[]>} - Array of requests that have been verified and had authorization checked
     */
    async checkLoginRequests(requests: TonomyRequest[]): Promise<CheckedRequest[]> {
        const response: CheckedRequest[] = [];

        await UserApps.verifyRequests(requests);

        for (const request of requests) {
            if (request.getType() === 'LoginRequest' && request instanceof LoginRequest) {
                const payload = request.getPayload();

                const app = await App.getApp(payload.origin);

                let requiresLogin = true;

                try {
                    await UserApps.verifyKeyExistsForApp(await this.user.getAccountName(), {
                        publicKey: payload.publicKey,
                    });
                    requiresLogin = false;
                } catch (e) {
                    if (e instanceof SdkError && e.code === SdkErrors.UserNotLoggedInWithThisApp) {
                        // Never consented
                        requiresLogin = true;
                    } else {
                        throw e;
                    }
                }

                response.push({
                    request,
                    app,
                    requiresLogin,
                    ssoApp: payload.origin === getSettings().ssoWebsiteOrigin,
                    requestDid: request.getIssuer(),
                });
            }
        }

        return response;
    }

    static async createJwkIssuerAndStore(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
        const { privateKey, publicKey } = generateRandomKeyPair();

        const signer = ES256KSigner(privateKey.data.array, true);
        const jwk = await createJWK(publicKey);
        const did = toDid(jwk);

        await keyManager.storeKey({
            level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
            privateKey: privateKey,
        });

        return {
            did,
            signer: signer as any,
            alg: 'ES256K-R',
        };
    }

    static async getJwkIssuerFromStorage(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
        const publicKey = await keyManager.getKey({
            level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
        });
        const signer = createVCSigner(keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);

        const jwk = await createJWK(publicKey);

        return {
            did: toDid(jwk),
            signer: signer.sign as any,
            alg: 'ES256K-R',
        };
    }

    /**
     * Verifies the login requests are valid requests signed by valid DIDs
     *
     * @param {TonomyRequest[]} requests - an array of login requests (LoginRequest or DataSharingRequest)
     * @returns {Promise<TonomyRequest[]>} - an array of verified login requests
     */
    static async verifyRequests(requests: TonomyRequest[]): Promise<TonomyRequest[]> {
        requests = requests.filter((request) => request !== null);

        for (const request of requests) {
            if (!(await request.verify())) {
                if (request.getType() === 'LoginRequest' && request instanceof LoginRequest) {
                    throwError(
                        `Invalid request for ${request.getType()} ${request.getPayload().origin}`,
                        SdkErrors.JwtNotValid
                    );
                } else if (request.getType() === 'DataSharingRequest' && request instanceof DataSharingRequest) {
                    throwError(`Invalid request for ${request.getType()} `, SdkErrors.JwtNotValid);
                }
            }
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

        if (!base64UrlPayload) throwError("payload parameter doesn't exist", SdkErrors.MissingParams);

        const parsedPayload = base64UrlToObj(base64UrlPayload);

        parsedPayload.requests = parsedPayload.requests.filter((request: string) => request !== null);

        if (!parsedPayload || !parsedPayload.requests)
            throwError('No requests found in payload', SdkErrors.MissingParams);

        const loginRequests = parsedPayload.requests.map((request: string) => {
            const [, payloadB64Url] = request.split('.');
            const payloadObj = base64UrlToObj(payloadB64Url);

            const type = payloadObj.vc.credentialSubject.type;

            if (type === 'LoginRequest') {
                return new LoginRequest(request);
            } else if (type === 'DataSharingRequest') {
                return new DataSharingRequest(request);
            } else {
                throwError('Invalid TonomyRequest Type');
            }
        });

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
     * @returns {Promise<TonomyRequest>} - the verified login request
     */
    static async onRedirectLogin(): Promise<TonomyRequest> {
        const { requests } = this.getLoginRequestFromUrl();

        const verifiedRequests = await UserApps.verifyRequests(requests);

        const docReferrer = document.referrer;

        if (!docReferrer) throwError('No referrer found', SdkErrors.ReferrerEmpty);

        const referrer = new URL(docReferrer);

        const myRequest = verifiedRequests.find((request) => {
            if (request.getType() === 'LoginRequest' && request instanceof LoginRequest) {
                const loginRequest = request.getPayload();

                return loginRequest.origin === referrer.origin;
            }

            return false;
        });

        if (!myRequest) {
            const msg =
                `No origins from: ${verifiedRequests.find(
                    (r) => r.getType() === 'LoginRequest' && r instanceof LoginRequest && r.getPayload().origin
                )} ` + `match referrer: ${referrer.origin}`;

            throwError(msg, SdkErrors.WrongOrigin);
        }

        return myRequest;
    }

    /**
     * Checks that a key exists in the key manager that has been authorized on the DID
     *
     * @description This is called on the callback page to verify that the user has logged in correctly
     *
     * @param {string} [accountName] - the account name to check the key on
     * @param {PublicKey} [publicKey] - the public key to check. if not supplied it will try lookup the app from window.location.origin
     * @param {KeyManager} [keyManager] - the key manager to check the key in
     * @param {KeyManagerLevel} [keyManagerLevel=BROWSER_LOCAL_STORAGE] - the level to check the key in
     * @returns {Promise<Name>} - the name of the permission that the key is authorized on
     *
     * @throws {SdkError} - if the key doesn't exist or isn't authorized
     */
    static async verifyKeyExistsForApp(
        accountName: Name,
        options: {
            publicKey?: PublicKey;
            keyManager?: KeyManager;
        }
    ): Promise<Name> {
        const account = await User.getAccountInfo(accountName);

        if (!account) throwError("couldn't fetch account", SdkErrors.AccountNotFound);

        if (options.publicKey) {
            const pubKey = options.publicKey;

            const permissionWithKey = account.permissions.find(
                (p) => p.required_auth.keys[0].key.toString() === pubKey.toString()
            );

            if (!permissionWithKey)
                throwError(`No permission found with key ${pubKey}`, SdkErrors.UserNotLoggedInWithThisApp);

            return permissionWithKey.perm_name;
        } else {
            if (!options.keyManager) throwError('keyManager missing', SdkErrors.MissingParams);
            const pubKey = await options.keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });

            const app = await App.getApp(window.location.origin);

            try {
                const permission = account.getPermission(app.accountName);
                const publicKey = permission.required_auth.keys[0].key;

                if (pubKey.toString() !== publicKey.toString()) throwError('key not authorized', SdkErrors.KeyNotFound);
            } catch (e) {
                if (e.message.startsWith('Unknown permission '))
                    throwError(`No permission found for app ${app.accountName}`, SdkErrors.UserNotLoggedInWithThisApp);
                else throw e;
            }

            return app.accountName;
        }
    }
}
