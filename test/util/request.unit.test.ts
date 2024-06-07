import { LoginRequestsMessage, generateRandomKeyPair, randomString } from '../../src/sdk';
import { createJWK } from '../../src/sdk/util/ssi/did-jwk';
import { ES256KSigner } from '@tonomy/did-jwt';
import { Issuer } from '@tonomy/did-jwt-vc';
import { toDid } from '../../src/sdk/util/ssi/did-jwk';
import { LoginRequest, LoginRequestPayload } from '../../src/sdk/util/request';
import { PublicKey } from '@wharfkit/antelope';

describe('Request class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();
        const signer = ES256KSigner(privateKey.data.array, true);
        const jwk = await createJWK(publicKey);
        const did = toDid(jwk);

        issuer = {
            did,
            signer,
            alg: 'ES256K-R',
        };
        request = {
            randomString: randomString(32),
            origin: 'https://tonomy.foundation',
            publicKey: publicKey,
            callbackPath: '/callback',
        };
    });

    it('creates a LoginRequest with the correct functions', async () => {
        const loginRequest = await LoginRequest.signRequest(request, issuer);

        expect(loginRequest).toBeDefined();
        expect(loginRequest.getVc).toBeDefined();
        expect(loginRequest.getIssuer).toBeDefined();
        expect(loginRequest.getPayload).toBeDefined();
        expect(loginRequest.getType).toBeDefined();
        expect(loginRequest.verify).toBeDefined();
        expect(loginRequest.toString).toBeDefined();
    });

    it('creates a LoginRequest with a did-jwk', async () => {
        const loginRequest = await LoginRequest.signRequest(request, issuer);

        expect(loginRequest.getIssuer()).toBe(issuer.did);
        expect(loginRequest.getPayload()).toStrictEqual(request);
        expect(loginRequest.getType()).toBe('LoginRequest');

        expect(await loginRequest.verify()).toBe(true);
        expect(loginRequest.toString().length).toBeGreaterThan(10);
    });
});

describe('LoginRequest class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;
    let loginRequest: LoginRequest;
    let myPublicKey: PublicKey;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        myPublicKey = publicKey;
        const signer = ES256KSigner(privateKey.data.array, true);
        const jwk = await createJWK(publicKey);
        const did = toDid(jwk);

        issuer = {
            did,
            signer,
            alg: 'ES256K-R',
        };
        request = {
            randomString: randomString(32),
            origin: 'https://tonomy.foundation',
            publicKey: publicKey,
            callbackPath: '/callback',
        };
        loginRequest = await LoginRequest.signRequest(request, issuer);
    });

    test('Creates LoginRequest payload is object with PublicKey type', async () => {
        const loginRequestPayload = await loginRequest.getPayload();

        expect(typeof loginRequestPayload).toBe('object');
        expect(loginRequestPayload.publicKey instanceof PublicKey).toBe(true);
        expect(loginRequestPayload.publicKey.toString()).toBe(myPublicKey.toString());
    });
});

describe('LoginRequestMessage class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;
    let loginRequest: LoginRequest;
    let loginRequestMessage: LoginRequestsMessage;
    let myPublicKey: PublicKey;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        myPublicKey = publicKey;
        const signer = ES256KSigner(privateKey.data.array, true);
        const jwk = await createJWK(publicKey);
        const did = toDid(jwk);

        issuer = {
            did,
            signer,
            alg: 'ES256K-R',
        };
        request = {
            randomString: randomString(32),
            origin: 'https://tonomy.foundation',
            publicKey: publicKey,
            callbackPath: '/callback',
        };
        loginRequest = await LoginRequest.signRequest(request, issuer);
        loginRequestMessage = await LoginRequestsMessage.signMessage(
            { requests: [loginRequest] },
            issuer,
            'did:unknown'
        );
    });

    test('Creates serialized LoginRequestMessage and can decode to get unserialized LoginRequest objects', async () => {
        const serializedRequests = await loginRequestMessage.getPayload();

        expect(serializedRequests).toBeInstanceOf(Object);
        expect(serializedRequests.requests).toBeInstanceOf(Array);
        expect(serializedRequests.requests.length).toBe(1);
        const request = serializedRequests.requests[0].getPayload();

        expect(request).toBeInstanceOf(Object);
        expect(request.publicKey).toBeInstanceOf(PublicKey);
        expect(request.publicKey.toString()).toBe(myPublicKey.toString());
    });
});
