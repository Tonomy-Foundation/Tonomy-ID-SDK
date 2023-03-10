import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions } from './userApps';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { ES256KSigner } from '@tonomy/did-jwt';
import { createJWK, toDid } from './util/did-jwk';
import { Message } from './util/message';
import { getSettings } from './settings';

export class ExternalUser {
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
