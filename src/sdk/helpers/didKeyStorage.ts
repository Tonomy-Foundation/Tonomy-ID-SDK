import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { Issuer } from 'did-jwt-vc';
import { JsKeyManager, createVCSigner, generateRandomKeyPair } from '..';
import { toDidKey, toDidKeyIssuer } from '../util/ssi/did-key';

export async function createDidKeyIssuerAndStore(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
    const { privateKey } = generateRandomKeyPair();

    const issuer = await toDidKeyIssuer(privateKey);

    await keyManager.storeKey({
        level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
        privateKey: privateKey,
    });

    return issuer;
}

export async function getDidKeyIssuerFromStorage(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
    const publicKey = await keyManager.getKey({
        level: KeyManagerLevel.BROWSER_LOCAL_STORAGE,
    });
    const signer = createVCSigner(keyManager, KeyManagerLevel.BROWSER_LOCAL_STORAGE);

    const did = await toDidKey(publicKey);

    return {
        did,
        signer: signer.sign as any,
        alg: 'ES256K-R',
    };
}
