/* eslint-disable camelcase */
import { Name, PublicKey } from '@wharfkit/antelope';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { User } from '../controllers/user';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkError, SdkErrors, throwError } from '../util/errors';
import { App, AppStatus } from '../controllers/app';
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
import { verifyRequests } from './requests';

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
     * @param {{request: TonomyRequest, app?: App, requiresLogin?: boolean}[]} requestsWithMetadata - Array of requests to fulfill (login or data sharing requests)
     * @param {DataSharingRequest} [dataSharingRequest] - Data sharing request to accept
     * @param {'mobile' | 'browser'} platform - Platform of the request, either 'mobile' or 'browser'
     * @param {DID} messageRecipient - DID of the recipient of the message
     * @returns {Promise<void | URLtype>} the callback url if the platform is mobile, or undefined if it is browser
     */
    async acceptLoginRequest(
        requestsWithMetadata: { request: TonomyRequest; app?: App; requiresLogin?: boolean }[],
        platform: 'mobile' | 'browser',
        messageRecipient?: DID
    ): Promise<void | URLtype> {
        const accountName = await this.user.getAccountName();

        const responsePayload: LoginRequestResponseMessagePayload = {
            success: true,
            requests: requestsWithMetadata.map((requestWithMeta) => requestWithMeta.request),
            accountName,
        };

        for (const requestWithMeta of requestsWithMetadata) {
            if (requestWithMeta.request.getType() === LoginRequest.getType()) {
                const { app, request, requiresLogin } = requestWithMeta;

                if (!app) throwError('Missing app', SdkErrors.MissingParams);

                if (requiresLogin ?? true) {
                    await this.user.apps.loginWithApp(app, request.getPayload().publicKey);
                }
            } else if (requestWithMeta.request.getType() === DataSharingRequest.getType()) {
                if (requestWithMeta.request.getPayload().username === true) {
                    const username = await this.user.getUsername();

                    responsePayload.username = username;
                }
            }
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
        requests: TonomyRequest[],
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
            requests,
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
     * @param {LoginRequest[]} requests - Array of LoginRequest to check
     * @returns {Promise<CheckedRequest[]>} - Array of requests that have been verified and had authorization checked
     */
    async checkLoginRequests(requests: LoginRequest[]): Promise<CheckedRequest[]> {
        await verifyRequests(requests);
        const response: CheckedRequest[] = [];

        for (const request of requests) {
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

        return response;
    }

    /**
     * Extracts the TonomyRequests from the URL
     *
     * @returns {LoginRequestsMessagePayload} the requests, username and accountName
     */
    static getLoginRequestFromUrl(): LoginRequestsMessagePayload {
        const params = new URLSearchParams(window.location.search);

        const base64UrlPayload = params.get('payload');

        if (!base64UrlPayload) throwError("payload parameter doesn't exist", SdkErrors.MissingParams);

        // get unparsed LoginRequestsMessagePayload object
        const unparsedLoginRequestMessagePayload = base64UrlToObj(base64UrlPayload);

        if (!unparsedLoginRequestMessagePayload.requests)
            throwError('No requests found in payload', SdkErrors.MissingParams);

        const unparsedRequestStrings = unparsedLoginRequestMessagePayload.requests.filter(
            (request: string) => request !== null
        );

        if (!unparsedRequestStrings) throwError('No requests found in payload', SdkErrors.MissingParams);

        const requests = unparsedRequestStrings.map((request: string) => {
            const tonomyRequest = new TonomyRequest(request);

            if (tonomyRequest.getType() === LoginRequest.getType()) {
                return new LoginRequest(tonomyRequest);
            } else if (tonomyRequest.getType() === DataSharingRequest.getType()) {
                return new DataSharingRequest(tonomyRequest);
            } else {
                throwError('Invalid TonomyRequest Type', SdkErrors.InvalidRequestType);
            }
        });

        return { requests };
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
            if (!parsedPayload.accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
            const res: LoginRequestResponseMessagePayload = {
                success: true,
                requests,
                accountName: Name.from(parsedPayload.accountName),
            };

            if (parsedPayload.username) res.username = new TonomyUsername(parsedPayload.username);
            return res;
        } else {
            if (!parsedPayload.error) throwError("error parameter doesn't exists", SdkErrors.MissingParams);
            return { success: false, requests, error: parsedPayload.error };
        }
    }

    /**
     * Verifies the TonomyRequest received in the URL were successfully authorized by Tonomy ID
     *
     * @description should be called in the callback page of the SSO Login website
     *
     * @returns {Promise<TonomyRequest>} - the verified TonomyRequest
     */
    static async onRedirectLogin(): Promise<TonomyRequest> {
        const { requests } = this.getLoginRequestFromUrl();

        const verifiedRequests = await verifyRequests(requests);

        const docReferrer = document.referrer;

        if (!docReferrer) throwError('No referrer found', SdkErrors.ReferrerEmpty);

        const referrer = new URL(docReferrer);

        const myRequest = verifiedRequests.find((request) => {
            if (request.getType() === LoginRequest.getType()) {
                const loginRequest = request.getPayload();

                return loginRequest.origin === referrer.origin;
            }

            return false;
        });

        if (!myRequest) {
            const msg =
                `No origins from: ${verifiedRequests.find(
                    (r) => r.getType() === LoginRequest.getType() && r.getPayload().origin
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
