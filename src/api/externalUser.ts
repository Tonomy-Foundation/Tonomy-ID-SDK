import { KeyManager, KeyManagerLevel } from '../sdk/storage/keymanager';
import { createVCSigner, randomString } from '../sdk/util/crypto';
import { Issuer } from 'did-jwt-vc';
import { getSettings } from '../sdk/util/settings';
import { SdkError, SdkErrors, createSdkError, throwError } from '../sdk/util/errors';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../sdk/storage/storage';
import { Name, API, NameType } from '@wharfkit/antelope';
import { TonomyUsername } from '../sdk/util/username';
import { browserStorageFactory } from '../sdk/storage/browserStorage';
import { getAccount, getChainInfo } from '../sdk/services/blockchain/eosio/eosio';
import { JsKeyManager } from '../sdk/storage/jsKeyManager';
import { LoginRequest, LoginRequestPayload } from '../sdk/util/request';
import { DataSharingRequest, DataSharingRequestPayload, getAccountNameFromDid, parseDid } from '../sdk/util';
import {
    AuthenticationMessage,
    Communication,
    TonomyContract,
    LinkAuthRequestMessage,
    LinkAuthRequestResponseMessage,
    LoginRequestsMessagePayload,
    Message,
    ResponsesManager,
} from '../sdk';
import { objToBase64Url } from '../sdk/util/base64';
import { VerifiableCredential } from '../sdk/util/ssi/vc';
import { DIDurl, JWT } from '../sdk/util/ssi/types';
import { Signer, createKeyManagerSigner, transact } from '../sdk/services/blockchain/eosio/transaction';
import { createDidKeyIssuerAndStore } from '../sdk/helpers/didKeyStorage';
import { getLoginRequestResponseFromUrl } from '../sdk/helpers/urls';
import { verifyKeyExistsForApp } from '../sdk/helpers/user';
import { IOnPressLoginOptions } from '../sdk/types/User';
import { App } from '../sdk/controllers/App';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:externalUser');

/**
 * The storage data for an external user that has logged in with Tonomy ID
 *
 * @param {Name} accountName - the account name of the user
 * @param {TonomyUsername} [username] - the username of the user
 * @param {Name} appPermission - the account name of the app the user is logged in with
 * @param {string} did - the DID of the user
 */
export type ExternalUserStorage = {
    accountName: Name;
    username?: TonomyUsername;
    appPermission: Name;
    did: string;
};

export type VerifyLoginOptions = {
    checkKeys?: boolean;
    keyManager?: KeyManager;
    storageFactory?: StorageFactory;
};

export type LoginWithTonomyMessages = {
    loginRequest: LoginRequest;
    dataSharingRequest?: DataSharingRequest;
    loginToCommunication: AuthenticationMessage;
};

const tonomyContract = TonomyContract.Instance;

/**
 * The data of a client authorization request
 *
 * @param {string} [username] - the username of the user
 *
 */
export type ClientAuthorizationData = Record<string, any> &
    object & {
        username?: string;
    };

/**
 * An external user on a website that is being logged into by a Tonomy ID user
 *
 */
export class ExternalUser {
    keyManager: KeyManager;
    storage: ExternalUserStorage & PersistentStorageClean;
    did: string;
    communication: Communication;

    /**
     * Creates a new external user
     *
     * @param {KeyManager} _keyManager - the key manager to use for signing
     * @param {StorageFactory} _storageFactory - the storage factory to use for persistent storage
     */
    constructor(_keyManager: KeyManager, _storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<ExternalUserStorage>(STORAGE_NAMESPACE + 'external.user.', _storageFactory);
        this.communication = new Communication(false);
    }

    /**
     * Removes the keys and clear storage
     *
     */
    async logout() {
        this.storage.clear();
        this.keyManager.removeKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });
        this.keyManager.removeKey({ level: KeyManagerLevel.BROWSER_SESSION_STORAGE });
    }

    /**
     * Retrieves the user from persistent storage if it exists and verifies the keys are valid
     *
     * @property {boolean} [options.autoLogout] - automatically logsout on error if this key is false
     * @property {StorageFactory} [options.storageFactory=browserStorageFactory] - the storage factory to use for persistent storage
     * @property {KeyManager} [options.keyManager=new JsKeyManager()] - the key manager to use for signing
     * @returns {Promise<ExternalUser>} - the user
     */
    static async getUser(options?: {
        autoLogout?: boolean;
        storageFactory?: StorageFactory;
        keyManager?: KeyManager;
    }): Promise<ExternalUser> {
        const keyManager = options?.keyManager ?? new JsKeyManager();
        const storageFactory = options?.storageFactory ?? browserStorageFactory;
        const autoLogout = options?.autoLogout ?? true;

        const user = new ExternalUser(keyManager, storageFactory);

        try {
            const accountName = await user.getAccountName();

            if (!accountName) {
                throw throwError('accountName not found', SdkErrors.AccountNotFound);
            }

            const appPermission = await verifyKeyExistsForApp(accountName, { keyManager });
            const appPermissionStorage = await user.getAppPermission();

            if (appPermission.toString() !== appPermissionStorage.toString())
                throwError('App permission has changed', SdkErrors.InvalidData);

            const username = await user.getUsername();

            if (username) {
                const personData = await tonomyContract.getPerson(username);

                if (accountName.toString() !== personData.account_name.toString())
                    throwError('Username has changed', SdkErrors.InvalidData);
            }

            return user;
        } catch (e) {
            if (autoLogout) await user.logout();
            if (e instanceof SdkError && (e.code === SdkErrors.KeyNotFound || e.code === SdkErrors.InvalidData))
                throwError('User Not loggedIn', SdkErrors.UserNotLoggedIn);
            throw e;
        }
    }

    /**
     * Returns the DID URL of the logged in user
     *
     * @returns {Promise<DIDurl>} - the DID of the user
     */
    async getDid(): Promise<DIDurl> {
        let did = this.did;

        if (!did) {
            const accountName = await (await this.getAccountName()).toString();
            const chainID = (await getChainInfo()).chain_id.toString();
            const appPermission = await this.getAppPermission();

            did = `did:antelope:${chainID}:${accountName}#${appPermission}`;
            this.did = did;
            await this.did;
        }

        return did;
    }

    /**
     * @returns {Promise{DIDurl}} the DID URL of the Tonomy ID wallet with #local fragment
     */
    async getWalletDid(): Promise<DIDurl> {
        const did = await this.getDid();
        const appPermission = await this.getAppPermission();

        return did.replace(`#${appPermission}`, '#local');
    }

    /**
     * Sets the account name of the user
     *
     * @param {Name} accountName - the account name of the user
     */
    private async setAccountName(accountName: Name): Promise<void> {
        this.storage.accountName = accountName;
        await this.storage.accountName;
    }

    /**
     * Sets the username of the user
     *
     * @param {string} username - the username of the user
     */
    private async setUsername(username: TonomyUsername): Promise<void> {
        this.storage.username = username;
        await this.storage.username;
    }

    /**
     * Sets the permission name of the app the user is logged into
     *
     * @param {Name} appPermission - the account name of the app
     */
    private async setAppPermission(appPermission: Name): Promise<void> {
        this.storage.appPermission = appPermission;
        await this.storage.appPermission;
    }

    /**
     * Gets the username of the user
     *
     * @returns {Promise<TonomyUsername>} - the username of the user
     */
    async getUsername(): Promise<TonomyUsername | undefined> {
        const storage = await this.storage.username;

        if (!storage) return;

        if (!storage) throwError('Username not set', SdkErrors.InvalidData);
        else if (storage instanceof TonomyUsername) {
            return storage;
        } else if (typeof storage === 'string') {
            return new TonomyUsername(storage);
        } else {
            throwError('Username not in expected format', SdkErrors.InvalidData);
        }
    }

    /**
     * Gets the account name of the user
     *
     * @returns {Promise<Name>} - the account name of the user
     */
    async getAccountName(): Promise<Name> {
        return await this.storage.accountName;
    }

    /**
     * Gets the permission name of the app the user is logged into
     *
     * @returns {Promise<Name>} - the account name of the app
     */
    async getAppPermission(): Promise<Name> {
        return await this.storage.appPermission;
    }

    /**
     * Redirects the user to login to the app with their Tonomy ID account
     *
     * @description should be called when the user clicks on the login button
     *
     * @param {IOnPressLoginOptions} onPressLoginOptions - options for the login
     * @property {boolean} onPressLoginOptions.redirect - if true, redirects the user to the login page, if false, returns the token
     * @property {string} onPressLoginOptions.callbackPath - the path to redirect the user to after login
     * @param {KeyManager} [keyManager] - the key manager to use to store the keys
     * @returns {Promise<LoginWithTonomyMessages | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static async loginWithTonomy(
        { redirect = true, callbackPath, dataRequest }: IOnPressLoginOptions,
        keyManager: KeyManager = new JsKeyManager()
    ): Promise<LoginWithTonomyMessages | void> {
        const issuer = await createDidKeyIssuerAndStore(keyManager);
        const publicKey = await keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });
        let dataSharingRequest;

        if (dataRequest) {
            const dataSharingPayload: DataSharingRequestPayload = {
                username: dataRequest?.username || false,
                origin: window.location.origin,
            };

            dataSharingRequest = await DataSharingRequest.signRequest(dataSharingPayload, issuer);
        }

        const payload: LoginRequestPayload = {
            randomString: randomString(32),
            origin: window.location.origin,
            publicKey: publicKey,
            callbackPath,
        };

        const loginRequest = await LoginRequest.signRequest(payload, issuer);

        if (redirect) {
            const payload: LoginRequestsMessagePayload = {
                requests: [loginRequest],
            };

            if (dataSharingRequest) {
                payload.requests.push(dataSharingRequest);
            }

            const base64UrlPayload = objToBase64Url(payload);

            window.location.href = `${getSettings().ssoWebsiteOrigin}/login?payload=${base64UrlPayload}`;
            return;
        } else {
            const loginToCommunication = await AuthenticationMessage.signMessageWithoutRecipient({}, issuer);

            return { loginRequest, dataSharingRequest, loginToCommunication };
        }
    }

    /**
     * Returns the issuer of the user for use with did-jwt and VCs
     *
     * @returns {Promise<Issuer>} - the issuer of the user
     */
    async getIssuer(): Promise<Issuer> {
        const did = await this.getDid();
        const signer = createVCSigner(this.keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);

        return {
            did,
            signer: signer.sign as any,
            alg: 'ES256K-R',
        };
    }

    /**
     * Receives the login request from Tonomy ID and verifies the login was successful
     *
     * @description should be called in the callback page
     *
     * @param {VerifyLoginOptions} [options] - options for the login
     * @property {boolean} [options.checkKeys = true] - if true, checks the keys in the keyManager against the blockchain
     * @property {KeyManager} [options.keyManager] - the key manager to use to storage and manage keys
     * @property {StorageFactory} [options.storageFactory] - the storage factory to use to store data
     *
     * @returns {Promise<ExternalUser>} an external user object ready to use
     */
    static async verifyLoginRequest(options?: VerifyLoginOptions): Promise<ExternalUser> {
        if (!options) options = {};
        if (!options.checkKeys) options.checkKeys = true;
        const keyManager = options.keyManager || new JsKeyManager();

        const { success, error, response } = getLoginRequestResponseFromUrl();

        if (success === true) {
            if (!response) throwError('No response found in url', SdkErrors.MissingParams);
            const managedResponses = new ResponsesManager(response);

            await managedResponses.verify();
            await managedResponses.fetchMeta();

            const loginResponse = managedResponses.getLoginResponsesWithSameOriginOrThrow();
            const keyFromStorage = await keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });
            const payload = loginResponse.getRequest().getPayload();

            if (payload.publicKey.toString() !== keyFromStorage.toString()) {
                throwError('Key in request does not match', SdkErrors.KeyNotFound);
            }

            const myStorageFactory = options.storageFactory || browserStorageFactory;
            const externalUser = new ExternalUser(keyManager, myStorageFactory);
            const accountName = loginResponse.getResponse().getPayload().accountName;

            if (options.checkKeys) {
                const permission = await verifyKeyExistsForApp(accountName, { keyManager });

                await externalUser.setAppPermission(permission);
            }

            await externalUser.setAccountName(accountName);

            const dataSharingResponse = managedResponses.getDataSharingResponseWithSameOrigin();

            if (dataSharingResponse && dataSharingResponse.getResponse().getPayload().data.username) {
                await externalUser.setUsername(dataSharingResponse.getResponse().getPayload().data.username);
            }

            return externalUser;
        } else {
            if (!error) throwError('No error found in url', SdkErrors.MissingParams);
            throwError(error.reason, error.code);
        }
    }

    /**
     * Signs a Verifiable Credential
     *
     * @param {string} id - the id of the VC
     * @param {string | string[]} type - the type of the VC
     * @param {object} data - the data of the VC
     * @property {string} [options.subject] - the subject of the VC
     *
     * @returns {Promise<VerifiableCredential>} - the signed VC
     */
    async signVc<T extends object = object>(
        id: string,
        type: string | string[],
        data: T,
        options: {
            subject?: string;
        } = {}
    ): Promise<VerifiableCredential<T>> {
        const issuer = await this.getIssuer();

        return await VerifiableCredential.sign<T>(id, type, data, issuer, options);
    }

    /**
     * Creates a client authorization request
     *
     * @param {T} data - the data of the client authorization request
     *
     * @returns {Promise<JWT>} - the signed client authorization request (a JWT string)
     */
    async createClientAuthorization<T extends ClientAuthorizationData = object>(data: T): Promise<JWT> {
        const origin = window?.location?.origin || 'undefined';
        const random = randomString(8);
        const id = origin + '/vc/auth/' + random;
        const type = 'ClientAuthorization';

        return (await this.signVc(id, type, data)).toString();
    }

    /**
     * Return a signer to use to sign transactions
     *
     * @returns {Promise<Signer>} - the signer to use to sign transactions
     */
    getTransactionSigner(): Signer {
        return createKeyManagerSigner(this.keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);
    }

    /**
     * Signs a transaction and send it to the blockchain
     *
     * Note: It is signed with the permission of the current app
     * e.g. if user signed into app "marketcom", this will be the name of the permission used to sign the transaction
     *
     * Note: This is a convenience method that signs one action on one smart contract with the current
     * user's account and app permission. To sign a more complex transaction, get a signer with
     * getTransactionSigner() and use eosjs or @wharfkit/antelope directly
     *
     * @param {Name} contract - the smart contract account name
     * @param {Name} action - the action to sign (function of the smart contract)
     * @param {object} data - the data to sign
     *
     * @returns {Promise<API.v1.PushTransactionResponse>} - the signed transaction
     */
    async signTransaction(
        contract: NameType | TonomyUsername,
        action: NameType,
        data: object
    ): Promise<API.v1.PushTransactionResponse> {
        const account = await this.getAccountName();
        const permission = await this.getAppPermission();

        let contractAccount: Name;

        if (contract instanceof TonomyUsername) {
            const app = await tonomyContract.getApp(contract);

            contractAccount = app.account_name;
        } else {
            contractAccount = Name.from(contract);
        }

        // This is a hack to get around linked_auth requirements on custom permissions
        // see https://github.com/Tonomy-Foundation/Tonomy-ID/issues/636#issuecomment-1508887362
        // and https://github.com/AntelopeIO/leap/issues/1131
        await this.checkLinkAuthRequirements(account, permission, contractAccount, action);

        // Setup the action to sign
        const newAction = {
            name: action.toString(),
            authorization: [
                {
                    actor: account.toString(),
                    permission: permission.toString(),
                },
            ],
            data: data,
        };
        const signer = this.getTransactionSigner();

        debug(
            `signTransaction() called by ${account.toString()} with permission ${permission.toString()} to contract ${contractAccount.toString()}`,
            JSON.stringify(newAction, null, 2)
        );

        return await transact(Name.from(contractAccount), [newAction], signer);
    }

    private async checkLinkAuthRequirements(
        actor: NameType,
        permission: NameType,
        contract: NameType,
        action: NameType
    ) {
        // Check that the permission is linked to the contract
        const account = await getAccount(actor);
        const authorizingPermission = account.permissions.find((p) => p.perm_name.equals(permission));
        const linkedAuth = authorizingPermission?.linked_actions?.find(
            // a.action is undefined for all actions, or the specific action
            (a) => a.account.equals(contract) && (!a.action || a.action.equals(action))
        );

        // If not then link it
        if (!linkedAuth) {
            const linkAuthRequestMessage = await LinkAuthRequestMessage.signMessage(
                {
                    contract: Name.from(contract),
                    action: Name.from(''), // empty action name means all actions on this contract
                },
                await this.getIssuer(),
                await this.getWalletDid()
            );
            let subscriberId: number;
            // TODO: abstract the request response dynamic into a function...
            const waitForResponse = new Promise<void>((resolve, reject) => {
                subscriberId = this.communication.subscribeMessage(async (message: Message) => {
                    try {
                        if (message.getSender() !== (await this.getWalletDid())) {
                            throwError('LinkAuthRequestResponse sender is not wallet', SdkErrors.SenderNotAuthorized);
                        }

                        const linkedAuthMsg = new LinkAuthRequestResponseMessage(message);

                        if (
                            linkAuthRequestMessage.getVc().getId() === linkedAuthMsg.getPayload().requestId &&
                            linkedAuthMsg.getPayload().success
                        ) {
                            resolve();
                        } else {
                            throwError("Couldn't link permission", SdkErrors.LinkAuthFailed);
                        }
                    } catch (e) {
                        reject(e);
                    }
                }, LinkAuthRequestResponseMessage.getType());

                setTimeout(() => {
                    reject(createSdkError('LinkAuthRequestResponse timeout', SdkErrors.MessageSendError));
                }, 5000);
            });

            await this.sendMessage(linkAuthRequestMessage);
            await waitForResponse;
            // @ts-expect-error subscriberId is used before it is defined
            this.communication.unsubscribeMessage(subscriberId);
        }
    }

    /**
     * Sends a message to another DID
     *
     * @param {Message} message - the message to send
     */
    async sendMessage(message: Message): Promise<void> {
        await this.loginToCommunication();
        const res = await this.communication.sendMessage(message);

        if (!res) throwError('Failed to send message', SdkErrors.MessageSendError);
    }

    private async loginToCommunication(): Promise<void> {
        if (!this.communication.isLoggedIn()) {
            const issuer = await this.getIssuer();
            const authMessage = await AuthenticationMessage.signMessageWithoutRecipient({}, issuer);

            await this.communication.login(authMessage);
        }
    }
}

/**
 * A verified client authorization request
 *
 * @param {JWT} request.jwt - the JWT of the request
 * @param {string} request.id - the unique id of the request
 * @param {string} [request.origin] - the origin of the request
 * @param {string} did - the DID of the user
 * @param {string} account - the account name of the user
 * @param {string} [username] - the username of the user
 * @param {T} data - the data of the request
 */
interface VerifiedClientAuthorization<T extends ClientAuthorizationData = object> {
    request: {
        jwt: JWT;
        id: string;
        origin?: string; // this is not verified
    };
    did: string;
    account: string;
    username?: string;
    data: T;
}

interface VerifyClientOptions {
    verifyChainId?: boolean;
    verifyUsername?: boolean;
    verifyOrigin?: boolean;
}

const defaultVerifyClientOptions: VerifyClientOptions = {
    verifyChainId: true,
    verifyUsername: true,
    verifyOrigin: true,
};

/**
 * Verifies a client authorization request
 *
 * @param {string} clientAuthorization - the client authorization request (JWT string)
 *
 * @returns {Promise<VerifiedClientAuthorization<T>>} - the verified client authorization request with data type T
 */
export async function verifyClientAuthorization<T extends ClientAuthorizationData = ClientAuthorizationData>(
    clientAuthorization: JWT,
    options?: VerifyClientOptions
): Promise<VerifiedClientAuthorization<T>> {
    const optionsWithDefaults = { ...defaultVerifyClientOptions, ...options };

    const vc = new VerifiableCredential(clientAuthorization);

    const vcId = vc.getId();
    const issuer = vc.getIssuer();
    const data: T = vc.getCredentialSubject() as T;
    const account = await getAccountNameFromDid(issuer).toString();

    const { method, id, fragment } = parseDid(issuer);

    if (method !== 'antelope') {
        throwError(`Invalid DID method: ${method}`, SdkErrors.InvalidData);
    }

    async function verifyChainId() {
        if (optionsWithDefaults.verifyChainId) {
            const { chain_id: chainId } = await getChainInfo();

            const didChainId = id.split(':')[0];

            if (didChainId !== chainId.toString()) {
                throwError(
                    `Invalid chain ID expected ${chainId.toString()} found ${didChainId}`,
                    SdkErrors.InvalidData
                );
            }
        }
    }

    const { username } = data;

    async function verifyUsername() {
        if (optionsWithDefaults.verifyUsername) {
            if (username) {
                const tonomyUsername = TonomyUsername.fromFullUsername(username);

                // this will throw if the username is not valid
                await tonomyContract.getPerson(tonomyUsername);
            }
        }
    }

    // get the request origin and id
    const origin = vcId?.split('/vc/auth/')[0];
    const requestId = vcId?.split('/vc/auth/')[1];

    async function verifyOrigin() {
        if (optionsWithDefaults.verifyOrigin) {
            if (!origin) throwError('Invalid origin', SdkErrors.InvalidData);
            const app = await App.getApp(origin);

            if (fragment !== app.accountName.toString()) throwError('Invalid app', SdkErrors.InvalidData);
        }
    }

    await Promise.all([vc.verify(), verifyChainId(), verifyUsername(), verifyOrigin()]);

    const request = {
        jwt: clientAuthorization,
        origin: origin && origin !== 'undefined' ? origin : undefined,
        id: requestId ? requestId : '',
    };

    return {
        request,
        did: issuer,
        account,
        data,
        username: username,
    };
}
