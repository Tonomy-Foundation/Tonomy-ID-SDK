import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from './userApps';
import { createVCSigner, generateRandomKeyPair, randomString } from './util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from './util/did-jwk';
import { Message } from './util/message';
import { getSettings } from './settings';
import { SdkErrors, throwError } from './services/errors';
import { JsKeyManager } from './managers/jskeymanager';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { Name } from '@greymass/eosio';
import { TonomyUsername } from './services/username';
import { browserStorageFactory } from './managers/browserStorage';

export type ExternalUserStorage = {
    accountName: Name;
    username: TonomyUsername;
    loginRequest: JWTLoginPayload;
};

export class ExternalUser {
    keyManager: KeyManager;
    storage: ExternalUserStorage & PersistentStorageClean;

    /**
     * Creates a new external user
     *
     * @param _keyManager {KeyManager} - the key manager to use for signing
     */
    constructor(_keyManager: KeyManager, _storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<ExternalUserStorage>('tonomy.externalUser.', _storageFactory);
    }

    /**
     * Sets the account name of the user
     *
     * @param accountName {Name} - the account name of the user
     */
    async setAccountName(accountName: Name): Promise<void> {
        this.storage.accountName = accountName;
        await this.storage.accountName;
    }

    /**
     * Sets the username of the user
     *
     * @param username {string} - the username of the user
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
     * @param loginRequest {JWTLoginPayload} - the login request
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
     * @param onPressLoginOptions {OnPressLoginOptions} - options for the login
     * @property onPressLoginOptions.redirect {boolean} - if true, redirects the user to the login page, if false, returns the token
     * @property onPressLoginOptions.callbackPath {string} - the path to redirect the user to after login
     * @param keyManager {KeyManager} - the key manager to use to store the keys
     * @param keyManagerLevel {KeyManagerLevel = BROWSER_LOCAL_STORAGE} - the level to store the keys at
     * @returns {Promise<string | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static async loginWithTonomy(
        { redirect = true, callbackPath }: OnPressLoginOptions,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ): Promise<string | void> {
        const { privateKey, publicKey } = generateRandomKeyPair();

        if (keyManager) {
            await keyManager.storeKey({
                level: keyManagerLevel,
                privateKey: privateKey,
            });
        }

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
     *
     * @param [keymanager=JSKEymanager]
     * @throws if user doesn't exists, keys are missing or user not loggedIn
     * @returns the external user object
     */
    //   static getUser(keymanager = JSsKeymanager: KeyManager): Promise<ExternalUser> {
    //  * checks storage for keys and other metadata
    //  * fethces user from blockchain
    //  * checks if user is loggedin by verifying the keys
    //  * delete the keys from storage if they are not verified
    //  * returns the user object
    //  */
    // return Object.assign(this, {})
    //   }

    /**
     * Signs a message with the given key manager and the key level
     *
     * @param message {any} - an object to sign
     * @param keyManager {KeyManager} - the key manager to use to sign the message
     * @param keyManagerLevel {KeyManagerLevel=BROWSER_LOCAL_STORAGE} - the level to use to sign the message
     */
    static async signMessage(
        message: any,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE,
        recipient?: string
    ): Promise<Message> {
        const publicKey = await keyManager.getKey({
            level: keyManagerLevel,
        });

        if (!publicKey) throw throwError('No Key Found for this level', SdkErrors.KeyNotFound);
        const signer = createVCSigner(keyManager, keyManagerLevel).sign;

        const jwk = await createJWK(publicKey);

        const issuer = toDid(jwk);

        return await Message.sign(message, { did: issuer, signer: signer as any, alg: 'ES256K-R' }, recipient);
    }

    /**
     * Receives the login request from Tonomy ID and verifies the login was successful
     *
     * @description should be called in the callback page
     * @param checkKeys {boolean} - if true, checks the keys in the keyManager against the blockchain
     * @param keyManager {KeyManager} - the key manager to use to storage and manage keys
     * @param storageFactory {StorageFactory} - the storage factory to use to store data
     *
     * @returns {Promise<ExternalUser>} an external user object ready to use
     */
    static async verifyLoginRequest(
        checkKeys = true,
        keyManager?: KeyManager,
        storageFactory?: StorageFactory
    ): Promise<ExternalUser> {
        const { requests, username, accountName } = UserApps.getLoginRequestParams();

        const result = await UserApps.verifyRequests(requests);

        const myKeyManager = keyManager || new JsKeyManager();
        const loginRequest = result.find((r) => r.getPayload().origin === window.location.origin)?.getPayload();

        if (!loginRequest) throwError('No login request found for this origin', SdkErrors.OriginMismatch);
        if (
            loginRequest.publicKey !==
            (await myKeyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE }))?.toString()
        )
            throwError('Key in request does not match', SdkErrors.KeyNotFound);

        if (checkKeys) {
            const keyExists = await UserApps.verifyKeyExistsForApp(accountName, myKeyManager);

            if (!keyExists) throwError('Key not found', SdkErrors.KeyNotFound);
        }

        const myStorageFactory = storageFactory || browserStorageFactory;
        const externalUser = new ExternalUser(myKeyManager, myStorageFactory);

        await externalUser.setAccountName(Name.from(accountName));
        await externalUser.setLoginRequest(loginRequest);
        await externalUser.setUsername(username);
        return externalUser;
    }
}
