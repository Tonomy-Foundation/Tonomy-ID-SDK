import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from './userApps';
import { createVCSigner, generateRandomKeyPair, randomString } from './util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from './util/did-jwk';
import { Message } from './util/message';
import { getSettings } from './settings';
import { SdkErrors, throwError } from './services/errors';
import { JsKeyManager } from '../test/services/jskeymanager';

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
     * Receives the login request from Tonomy ID and verifies the login was successful
     *
     * @description should be called in the callback page
     *
     * @returns {Promise<{ result: Message[]; username: string; accountName: string }>} the verified requests, accountName and username
     */
    static async verifyLoginRequest(
        checkKeys = true,
        keyManager?: KeyManager
    ): Promise<{ result: Message[]; username: string; accountName: string }> {
        const params = new URLSearchParams(window.location.search);
        const requests = params.get('requests');

        if (!requests) throwError("requests parameter doesn't exists", SdkErrors.MissingParams);
        const username = params.get('username');

        if (!username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);
        const accountName = params.get('accountName');

        if (!accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
        const result = await UserApps.verifyRequests(requests);

        if (checkKeys) {
            const myKeyManager = keyManager || new JsKeyManager();

            const keyExists = await UserApps.verifyKeyExistsForApp(accountName, myKeyManager);

            if (!keyExists) throwError('Key not found', SdkErrors.KeyNotFound);
        }

        return { result, username, accountName };
    }
}
