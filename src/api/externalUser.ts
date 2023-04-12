import { KeyManager, KeyManagerLevel } from '../sdk/services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from '../sdk/userApps';
import { createVCSigner, generateRandomKeyPair, randomString } from '../sdk/util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from '../sdk/util/did-jwk';
import { Message } from '../sdk/util/message';
import { getSettings } from '../sdk/settings';
import { SdkErrors, throwError } from '../sdk/services/errors';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../sdk/services/storage';
import { Checksum256, Name } from '@greymass/eosio';
import { TonomyUsername } from '../sdk/services/username';
import { browserStorageFactory } from '../sdk/managers/browserStorage';
import { getChainInfo } from '../sdk/services/eosio/eosio';
import { JsKeyManager } from '../sdk/managers/jsKeyManager';

export type ExternalUserStorage = {
    accountName: Name;
    username: TonomyUsername;
    loginRequest: JWTLoginPayload;
};

export type VerifyLoginOptions = {
    checkKeys?: boolean;
    keyManager?: KeyManager;
    storageFactory?: StorageFactory;
};

/**
 * An external user on a website that is being logged into by a Tonomy ID user
 *
 */
export class ExternalUser {
    keyManager: KeyManager;
    storage: ExternalUserStorage & PersistentStorageClean;
    did_: string;

    /**
     * Creates a new external user
     *
     * @param {KeyManager} _keyManager - the key manager to use for signing
     * @param {StorageFactory} _storageFactory - the storage factory to use for persistent storage
     */
    constructor(_keyManager: KeyManager, _storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<ExternalUserStorage>(STORAGE_NAMESPACE + 'external.user.', _storageFactory);
    }

    /**
     * Clear the storage and remove keys
     *
     */
    async logout(): Promise<void> {
        // remove all keys
        this.keyManager.removeKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });
        this.keyManager.removeKey({ level: KeyManagerLevel.BROWSER_SESSION_STORAGE });
        // clear storage data
        this.storage.clear();

    }

    /**
     * Retrieves the user from persistent storage if it exists and verifies the keys are valid
     *
     * @property {StorageFactory} [options.storageFactory=browserStorageFactory] - the storage factory to use for persistent storage
     * @property {KeyManager} [options.keyManager=new JsKeyManager()] - the key manager to use for signing
     * @returns {Promise<ExternalUser>} - the user
     */
    static async getUser(options?: {
        storageFactory?: StorageFactory;
        keyManager?: KeyManager;
    }): Promise<ExternalUser> {
        const keyManager = options?.keyManager || new JsKeyManager();
        const storageFactory = options?.storageFactory || browserStorageFactory;
        const user = new ExternalUser(keyManager, storageFactory);

        try {
            const accountName = await user.getAccountName();

            if (!accountName) {
                await user.logout();
                throw throwError('accountName not found', SdkErrors.AccountNotFound);
            }

            const result = await UserApps.verifyKeyExistsForApp(accountName.toString(), keyManager);

            if (result) {
                return user;
            } else {
                throw throwError('User Not loggedIn', SdkErrors.UserNotLoggedIn);
            }
        } catch (e) {
            await user.logout();
            throw e;
        }
    }

    

    /**
     * Returns the DID of the user
     *
     * @returns {Promise<string>} - the DID of the user
     */
    async getDid() {
        if (!this.did_) {
            const accountName = await (await this.getAccountName()).toString();
            const chainID = (await getChainInfo()).chain_id as unknown as Checksum256;

            this.did_ = `did:antelope:${chainID}:${accountName}#local`;
        }

        return this.did_;
    }

    /**
     * Sets the account name of the user
     *
     * @param {Name} accountName - the account name of the user
     */
    async setAccountName(accountName: Name): Promise<void> {
        this.storage.accountName = accountName;
        await this.storage.accountName;
    }

    /**
     * Sets the username of the user
     *
     * @param {string} username - the username of the user
     */
    async setUsername(username: string): Promise<void> {
        this.storage.username = new TonomyUsername(username);
        await this.storage.username;
    }

    /**
     * Gets the username of the user
     *
     * @returns {Promise<TonomyUsername>} - the username of the user
     */
    async getUsername(): Promise<TonomyUsername> {
        return await this.storage.username;
    }

    /**
     * Sets the login request
     *
     * @param {JWTLoginPayload} loginRequest - the login request
     */
    async setLoginRequest(loginRequest: JWTLoginPayload): Promise<void> {
        this.storage.loginRequest = loginRequest;
        await this.storage.loginRequest;
    }

    /**
     * Gets the login request
     *
     * @returns {Promise<JWTLoginPayload>} - the login request
     */
    async getLoginRequest(): Promise<JWTLoginPayload> {
        return await this.storage.loginRequest;
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
     * Redirects the user to login to the app with their Tonomy ID account
     *
     * @description should be called when the user clicks on the login button
     *
     * @param {OnPressLoginOptions} onPressLoginOptions - options for the login
     * @property {boolean} onPressLoginOptions.redirect - if true, redirects the user to the login page, if false, returns the token
     * @property {string} onPressLoginOptions.callbackPath - the path to redirect the user to after login
     * @param {KeyManager} keyManager - the key manager to use to store the keys
     * @returns {Promise<string | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static async loginWithTonomy(
        { redirect = true, callbackPath }: OnPressLoginOptions,
        keyManager: KeyManager = new JsKeyManager()
    ): Promise<string | void> {
        const { privateKey, publicKey } = generateRandomKeyPair();

        await keyManager.storeKey({
            level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
            privateKey: privateKey,
        });

        const payload: JWTLoginPayload = {
            randomString: randomString(32),
            origin: window.location.origin,
            publicKey: publicKey.toString(),
            callbackPath,
        };

        // TODO use expiresIn to make JWT expire after 5 minutes

        const signer = ES256KSigner(privateKey.data.array, true);
        const jwk = await createJWK(publicKey);

        const issuer = toDid(jwk);

        const token = (await Message.sign(payload, { did: issuer, signer: signer as any, alg: 'ES256K-R' })).jwt;

        const requests = [token];
        const requestsString = JSON.stringify(requests);

        if (redirect) {
            window.location.href = `${getSettings().ssoWebsiteOrigin}/login?requests=${requestsString}`;
            return;
        }

        return token;
    }

    /**
     * Signs a message with the given key manager and the key level
     *
     * @param {any} message - an object to sign
     * @property {string} options.recipient - the recipient's DID
     * @property {KeyManager} [options.keyManager=new JsKeyManager()] - the key manager to use to sign the message
     * @returns {Promise<Message>} - the signed message
     */
    static async signMessage(
        message: any,
        options: {
            recipient?: string;
            keyManager?: KeyManager;
        } = {}
    ): Promise<Message> {
        const keyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE;

        if (!options.keyManager) options.keyManager = new JsKeyManager();
        const publicKey = await options.keyManager.getKey({
            level: keyManagerLevel,
        });

        const signer = createVCSigner(options.keyManager, keyManagerLevel).sign;

        const jwk = await createJWK(publicKey);

        const issuer = toDid(jwk);

        return await Message.sign(message, { did: issuer, signer: signer as any, alg: 'ES256K-R' }, options.recipient);
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

        const { requests, username, accountName } = UserApps.getLoginRequestParams();

        const result = await UserApps.verifyRequests(requests);

        const loginRequest = result.find((r) => r.getPayload().origin === window.location.origin)?.getPayload();
        const keyFromStorage = await keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });

        if (!loginRequest) throwError('No login request found for this origin', SdkErrors.OriginMismatch);
        if (loginRequest.publicKey !== keyFromStorage.toString())
            throwError('Key in request does not match', SdkErrors.KeyNotFound);

        if (options.checkKeys) {
            const keyExists = await UserApps.verifyKeyExistsForApp(accountName, keyManager);

            if (!keyExists) throwError('Key not found', SdkErrors.KeyNotFound);
        }

        const myStorageFactory = options.storageFactory || browserStorageFactory;
        const externalUser = new ExternalUser(keyManager, myStorageFactory);

        await externalUser.setAccountName(Name.from(accountName));
        await externalUser.setLoginRequest(loginRequest);
        await externalUser.setUsername(username);
        return externalUser;
    }
}
