import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from './userApps';
import { createVCSigner, generateRandomKeyPair, randomString } from './util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from './util/did-jwk';
import { Message } from './util/message';
import { getSettings } from './settings';
import { SdkErrors, throwError } from './services/errors';
import { User } from './user';
import { App } from './app';
import { Name } from '@greymass/eosio';

export class ExternalUser {
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

    /**
     * checks storage for keys and other metadata
     * fethces user from blockchain
     * checks if user is loggedin by verifying the keys
     * delete the keys from storage if they are not verified
     * returns the user object
     */
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
        const account = await User.getAccountInfo(Name.from(accountName));
        const app = await App.getApp(window.location.origin);

        const publickey = account.getPermission(app.accountName).required_auth.keys[0].key;

        if (!pubKey) throwError("Couldn't fetch Key", SdkErrors.KeyNotFound);

        return pubKey.toString() === publickey.toString();
    }

    /**
     * Receives the login request from Tonomy ID and verifies the login was successful
     *
     * @description should be called in the callback page
     *
     * @returns {Promise<{ result: Message[]; username: string; accountName: string }>} the verified requests, accountName and username
     */
    static async verifyRequests(): Promise<{ result: Message[]; username: string; accountName: string }> {
        const params = new URLSearchParams(window.location.search);
        const requests = params.get('requests');

        if (!requests) throwError("requests parameter doesn't exists", SdkErrors.MissingParams);
        const username = params.get('username');

        if (!username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);
        const accountName = params.get('accountName');

        if (!accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
        const result = await UserApps.verifyRequests(requests);

        return { result, username, accountName };
    }
}
