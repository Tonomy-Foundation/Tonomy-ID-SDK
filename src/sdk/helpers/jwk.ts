/* eslint-disable camelcase */
import { Name, PublicKey } from '@wharfkit/antelope';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { User } from '../controllers/user';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkError, SdkErrors, throwError } from '../util/errors';
import { App, AppStatus } from '../controllers/app';
import { TonomyUsername } from '../util/username';
import { LoginRequest, TonomyRequest } from '../util/request';
import { LoginRequestResponseMessage, LoginRequestsMessagePayload } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { base64UrlToObj, objToBase64Url } from '../util/base64';
import { getSettings } from '../util/settings';
import { DID, URL as URLtype } from '../util/ssi/types';
import { Issuer } from '@tonomy/did-jwt-vc';
import { ES256KSigner, JsKeyManager, createVCSigner, generateRandomKeyPair } from '..';
import { createJWK, toDid } from '../util/ssi/did-jwk';
import { DataSharingRequest } from '../util';

export async function createJwkIssuerAndStore(keyManager: KeyManager = new JsKeyManager()): Promise<Issuer> {
    const { privateKey, publicKey } = generateRandomKeyPair();

    const signer = ES256KSigner(privateKey.data.array, true);
    const jwk = await createJWK(publicKey);
    const did = toDid(jwk);

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

    const jwk = await createJWK(publicKey);

    return {
        did: toDid(jwk),
        signer: signer.sign as any,
        alg: 'ES256K-R',
    };
}
