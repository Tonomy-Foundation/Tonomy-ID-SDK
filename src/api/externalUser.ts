import { KeyManager, KeyManagerLevel } from '../sdk/storage/keymanager';
import { OnPressLoginOptions, UserApps } from '../sdk/helpers/userApps';
import { createVCSigner, randomString } from '../sdk/util/crypto';
import { Issuer } from '@tonomy/did-jwt-vc';
import { getSettings } from '../sdk/util/settings';
import { SdkError, SdkErrors, createSdkError, throwError } from '../sdk/util/errors';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../sdk/storage/storage';
import { Name, API, NameType } from '@wharfkit/antelope';
import { TonomyUsername } from '../sdk/util/username';
import { browserStorageFactory } from '../sdk/storage/browserStorage';
import { getAccount, getChainInfo } from '../sdk/services/blockchain/eosio/eosio';
import { JsKeyManager } from '../sdk/storage/jsKeyManager';
import { LoginRequest, LoginRequestPayload } from '../sdk/util/request';
import { DataSharingRequest, DataSharingRequestPayload } from '../sdk/util';
import {
    AuthenticationMessage,
    Communication,
    IDContract,
    LinkAuthRequestMessage,
    LinkAuthRequestResponseMessage,
    LoginRequestsMessagePayload,
    Message,
} from '../sdk';
import { objToBase64Url } from '../sdk/util/base64';
import { VerifiableCredential } from '../sdk/util/ssi/vc';
import { DIDurl } from '../sdk/util/ssi/types';
import { Signer, createKeyManagerSigner, transact } from '../sdk/services/blockchain/eosio/transaction';
import { createJwkIssuerAndStore } from '../sdk/helpers/jwkStorage';
import { verifyRequests } from '../sdk/helpers/requests';
import { getLoginRequestResponseFromUrl } from '../sdk/helpers/urls';

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

const idContract = IDContract.Instance;

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

            const appPermission = await UserApps.verifyKeyExistsForApp(accountName, { keyManager });
            const appPermissionStorage = await user.getAppPermission();

            if (appPermission.toString() !== appPermissionStorage.toString())
                throwError('App permission has changed', SdkErrors.InvalidData);

            const usernameStorage = await user.getUsername();
            const personData = await idContract.getPerson(usernameStorage);

            if (accountName.toString() !== personData.account_name.toString())
                throwError('Username has changed', SdkErrors.InvalidData);
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
     * @param {OnPressLoginOptions} onPressLoginOptions - options for the login
     * @property {boolean} onPressLoginOptions.redirect - if true, redirects the user to the login page, if false, returns the token
     * @property {string} onPressLoginOptions.callbackPath - the path to redirect the user to after login
     * @param {KeyManager} [keyManager] - the key manager to use to store the keys
     * @returns {Promise<LoginWithTonomyMessages | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static async loginWithTonomy(
        { redirect = true, callbackPath, dataRequest }: OnPressLoginOptions,
        keyManager: KeyManager = new JsKeyManager()
    ): Promise<LoginWithTonomyMessages | void> {
        const issuer = await createJwkIssuerAndStore(keyManager);
        const publicKey = await keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });
        let dataSharingRequest;

        if (dataRequest) {
            const dataSharingPayload: DataSharingRequestPayload = {
                username: dataRequest?.username || false,
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
     * @param {KeyManager} [keyManager] - the key manager to use to store the keys
     * @returns {Promise<Issuer>} - the issuer of the user
     */
    async getIssuer(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
        const did = await this.getDid();
        const signer = createVCSigner(keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);

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

        const { success, error, requests, response } = getLoginRequestResponseFromUrl();

        if (success === true) {
            if (!response?.accountName) throwError('No account name found in url', SdkErrors.MissingParams);

            verifyRequests(requests);

            const loginRequest = requests.find((r) => {
                if (r.getType() === LoginRequest.getType()) {
                    const payload = r.getPayload();

                    if (payload && payload.origin === window.location.origin) {
                        return true;
                    }
                }

                return false;
            });
            const keyFromStorage = await keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });

            if (!loginRequest) throwError('No login request found for this origin', SdkErrors.OriginMismatch);

            if (loginRequest.getType() === LoginRequest.getType()) {
                const payload = loginRequest.getPayload();

                if (payload.publicKey.toString() !== keyFromStorage.toString()) {
                    throwError('Key in request does not match', SdkErrors.KeyNotFound);
                }
            }

            const myStorageFactory = options.storageFactory || browserStorageFactory;
            const externalUser = new ExternalUser(keyManager, myStorageFactory);

            if (options.checkKeys) {
                const permission = await UserApps.verifyKeyExistsForApp(response.accountName, { keyManager });

                await externalUser.setAppPermission(permission);
            }

            await externalUser.setAccountName(response.accountName);

            if (response.data?.username) {
                await externalUser.setUsername(response.data.username);
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
    async signTransaction(contract: NameType, action: NameType, data: object): Promise<API.v1.PushTransactionResponse> {
        const account = await this.getAccountName();
        const permission = await this.getAppPermission();

        // This is a hack to get around linked_auth requirements on custom permissions
        // see https://github.com/Tonomy-Foundation/Tonomy-ID/issues/636#issuecomment-1508887362
        // and https://github.com/AntelopeIO/leap/issues/1131
        await this.checkLinkAuthRequirements(account, permission, contract, action);

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

        return await transact(Name.from(contract), [newAction], signer);
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
                { contract: Name.from(contract), action: Name.from('') },
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
