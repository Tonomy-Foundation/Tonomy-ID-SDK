import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions, UserApps } from './userApps';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from './util/did-jwk';
import { Message } from './util/message';
import { getSettings } from './settings';
import { SdkErrors, throwError } from './services/errors';

export class ExternalUser {
    private _did: string;

    constructor(
        private keyManager: KeyManager,
        private keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ) {}

    get did() {
        if (!this._did) {
            const did = localStorage.getItem('tonomy.user.did');

            if (did) {
                this._did;
            } else {
                throw throwError('No did found in storage');
            }
        }

        return this._did;
    }
    static async getUser(
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ): Promise<ExternalUser | false> {
        const accountName = localStorage.getItem('tonomy.user.accountName');

        if (!accountName) {
            //TODO: logout
            // keyManager.clear(); must be implemented in future keymanager
            throw throwError('accountName not found', SdkErrors.AccountNotFound);
        }

        try {
            const result = await UserApps.verifyKeyExistsForApp(accountName, keyManager, keyManagerLevel);

            if (result) {
                return new ExternalUser(keyManager, keyManagerLevel);
            } else {
                throw throwError('User Not loggedIn');
            }
        } catch (e) {
            //TODO logout
            // keyManager.clear(); must be implemented in future keymanager
            return false;
        }
    }

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

        // const token = (await this.signMessage(payload, keyManager, keyManagerLevel)).jwt;

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
     *
     * @param keymanager
     * @throws error if user didn't login correctly
     * @returns external user objects
     */
    //   static verifyLogin(keymanager = JSsKeymanager: KeyManager, storage = jsStorage: Storage):  Promise<ExternalUser>  {
    //     userApps.callBack(keymanager);
    //     return Object.assign(this, {})
    //   }
}
