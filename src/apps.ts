/* eslint-disable camelcase */
import { ES256KSigner, createJWT } from 'did-jwt';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { createJWK, toDid } from './util/did-jwk';

async function onPressLogin(window: Window, redirect = false): Promise<string | void> {
    const { privateKey, publicKey } = generateRandomKeyPair();
    const payload = {
        number: randomString(32),
        origin: window.location.hostname,
        pubkey: publicKey.toString(),
    };

    const signer = ES256KSigner(privateKey.data.array, true);

    const jwk = await createJWK(publicKey);
    const issuer = toDid(jwk);
    const token = await createJWT(payload, { issuer, signer, alg: 'ES256K-R' });
    if (redirect) {
        // const settings = await getSettings();
        // TODO update settings to redirect to the tonomy id website
        window.location = `https://id.tonomy.com/login?jwt=${token}`;
        return;
    }
    return token;
}

export { onPressLogin };
