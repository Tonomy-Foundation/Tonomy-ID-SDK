/* eslint-disable camelcase */
import { Name, PublicKey } from '@greymass/eosio';
import { ES256KSigner, createJWT } from 'did-jwt';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager } from './services/keymanager';
import { PersistentStorage } from './services/storage';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { createJWK, toDid } from './util/did-jwk';
import { UserStorage } from './user';

const idContract = IDContract.Instance;

export async function onPressLogin(window: Window, redirect = false): Promise<string | void> {
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

type UserAppStorage = {
    apps: {
        account: string;
        added: Date;
    }[];
};

export default class App {
    keyManager: KeyManager;
    storage: PersistentStorage & UserStorage & UserAppStorage;

    constructor(_keyManager: KeyManager, _storage: PersistentStorage) {
        this.keyManager = _keyManager;
        this.storage = _storage as PersistentStorage & UserStorage & UserAppStorage;
    }

    async loginWithApp(account: Name, key: PublicKey): Promise<void> {
        const myAccount = await this.storage.accountName;
        await idContract.loginwithapp(myAccount, key, createSigner(privateKey));
    }
}
