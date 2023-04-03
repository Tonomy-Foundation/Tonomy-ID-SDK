import { KeyManager, KeyManagerLevel } from '../sdk/services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from '../sdk/userApps';
import { createVCSigner, generateRandomKeyPair, randomString } from '../sdk/util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from '../sdk/util/did-jwk';
import { Message } from '../sdk/util/message';
import { getSettings } from '../sdk/settings';
import { SdkErrors, throwError } from '../sdk/services/errors';
import { createStorage, PersistentStorageClean, StorageFactory } from '../sdk/services/storage';
import { Checksum256, Name } from '@greymass/eosio';
import { TonomyUsername } from '../sdk/services/username';
import { browserStorageFactory } from '../sdk/managers/browserStorage';
import { getChainInfo } from '../sdk/services/eosio/eosio';

export type ExternalUserStorage = {
    accountName: Name;
    username: TonomyUsername;
    loginRequest: JWTLoginPayload;
};

export type VerifyLoginOptions = {
    checkKeys?: boolean;
    keyManager: KeyManager;
    storageFactory?: StorageFactory;
};

export class ExternalUser {
    keyManager: KeyManager;
    storage: ExternalUserStorage & PersistentStorageClean;
    did_: string;

    /**
     * Creates a new external user
     *
     * @param _keyManager {KeyManager} - the key manager to use for signing
     */
    constructor(_keyManager: KeyManager, _storageFactory: StorageFactory) {
        this.keyManager = _keyManager;
        this.storage = createStorage<ExternalUserStorage>('tonomy.externalUser.', _storageFactory);
    }

    static async getUser(
        keyManager: KeyManager,
        storageFactory: StorageFactory = browserStorageFactory
    ): Promise<ExternalUser> {
        const user = new ExternalUser(keyManager, storageFactory);

        try {
            const accountName = await user.getAccountName();

            if (!accountName) {
                //TODO: logout
                // keyManager.clear(); must be implemented in future keymanager
                throw throwError('accountName not found', SdkErrors.AccountNotFound);
            }

            const result = await UserApps.verifyKeyExistsForApp(accountName.toString(), keyManager);

            if (result) {
                return user;
            } else {
                throw throwError('User Not loggedIn', SdkErrors.UserNotLoggedIn);
            }
        } catch (e) {
            //TODO logout
            // keyManager.clear(); must be implemented in future keymanager
            user.storage.clear();
            throw e;
        }
    }

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
     * @returns {Promise<string | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static async loginWithTonomy(
        { redirect = true, callbackPath }: OnPressLoginOptions,
        keyManager: KeyManager
    ): Promise<string | void> {
        const { privateKey, publicKey } = generateRandomKeyPair();

        if (keyManager) {
            await keyManager.storeKey({
                level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
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
     */
    static async signMessage(message: any, keyManager: KeyManager, recipient?: string): Promise<Message> {
        const keyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE;
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
     *
     * @param {options} VerifyLoginOptions - options for the login
     * @property {options.checkKeys} boolean - if true, checks the keys in the keyManager against the blockchain
     * @property {options.keyManager} KeyManager - the key manager to use to storage and manage keys
     * @property {options.storageFactory} [StorageFactory] - the storage factory to use to store data
     *
     * @returns {Promise<ExternalUser>} an external user object ready to use
     */
    static async verifyLoginRequest(options: VerifyLoginOptions): Promise<ExternalUser> {
        if (!options.checkKeys) options.checkKeys = true;

        const { requests, username, accountName } = UserApps.getLoginRequestParams();

        const result = await UserApps.verifyRequests(requests);

        const loginRequest = result.find((r) => r.getPayload().origin === window.location.origin)?.getPayload();

        if (!loginRequest) throwError('No login request found for this origin', SdkErrors.OriginMismatch);
        if (
            loginRequest.publicKey !==
            (await options.keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE }))?.toString()
        )
            throwError('Key in request does not match', SdkErrors.KeyNotFound);

        if (options.checkKeys) {
            const keyExists = await UserApps.verifyKeyExistsForApp(accountName, options.keyManager);

            if (!keyExists) throwError('Key not found', SdkErrors.KeyNotFound);
        }

        const myStorageFactory = options.storageFactory || browserStorageFactory;
        const externalUser = new ExternalUser(options.keyManager, myStorageFactory);

        await externalUser.setAccountName(Name.from(accountName));
        await externalUser.setLoginRequest(loginRequest);
        await externalUser.setUsername(username);
        return externalUser;
    }
}
