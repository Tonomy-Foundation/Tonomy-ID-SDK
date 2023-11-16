/* eslint-disable camelcase */
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { Issuer } from '@tonomy/did-jwt-vc';
import { ES256KSigner, JsKeyManager, createVCSigner, generateRandomKeyPair } from '..';
import { publicKeyToDidKey } from '../util/ssi/did-jwk';

export async function createJwkIssuerAndStore(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
    const { privateKey, publicKey } = generateRandomKeyPair();

    const signer = ES256KSigner(privateKey.data.array, true);
    const did = await publicKeyToDidKey(publicKey);

    await keyManager.storeKey({
        level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
        privateKey: privateKey,
    });

    return {
        did,
        signer: signer as any,
        alg: 'ES256K-R',
    };
}

export async function getJwkIssuerFromStorage(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
    const publicKey = await keyManager.getKey({
        level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
    });
    const signer = createVCSigner(keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);

    const did = await publicKeyToDidKey(publicKey);

    return {
        did,
        signer: signer.sign as any,
        alg: 'ES256K-R',
    };
}
