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

/**
 * Verifies the TonomyRequests are valid requests signed by valid DIDs
 *
 * @param {TonomyRequest[]} requests - an array of TonomyRequests (LoginRequest or DataSharingRequest)
 * @returns {Promise<TonomyRequest[]>} - an array of verified login requests
 */
export async function verifyRequests(requests: TonomyRequest[]): Promise<TonomyRequest[]> {
    requests = requests.filter((request) => request !== null);

    for (const request of requests) {
        if (!(await request.verify())) {
            if (request.getType() === LoginRequest.getType()) {
                throwError(
                    `Invalid request for ${request.getType()} ${request.getPayload().origin}`,
                    SdkErrors.JwtNotValid
                );
            } else if (request.getType() === DataSharingRequest.getType()) {
                throwError(`Invalid request for ${request.getType()} `, SdkErrors.JwtNotValid);
            }
        }
    }

    return requests;
}
