import { LoginRequestsMessage, generateRandomKeyPair, randomString } from '../../src/sdk';
import { Issuer } from 'did-jwt-vc';
import {
    DualWalletRequests,
    LoginRequestPayload,
    WalletRequest,
    WalletRequestPayload,
    WalletRequestVerifiableCredential,
} from '../../src/sdk/util/request';
import { PublicKey } from '@wharfkit/antelope';
import { toDidKeyIssuer } from '../../src/sdk/util/ssi/did-key';

describe('Request class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;
    let walletRequestPayload: WalletRequestPayload;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        issuer = await toDidKeyIssuer(privateKey);

        request = {
            login: {
                randomString: randomString(32),
                origin: 'https://tonomy.foundation',
                publicKey: publicKey,
                callbackPath: '/callback',
            },
        };
        walletRequestPayload = {
            requests: [request],
        };
    });

    it('creates a WalletRequest with the correct functions', async () => {
        const vc = await WalletRequestVerifiableCredential.signRequest(walletRequestPayload, issuer);
        const walletRequest = new WalletRequest(vc);

        expect(walletRequest).toBeDefined();
        expect(walletRequest.vc).toBeDefined();
        expect(walletRequest.getApp).toBeDefined();
        expect(walletRequest.getDid).toBeDefined();
        expect(walletRequest.getOrigin).toBeDefined();
        expect(walletRequest.getRequests).toBeDefined();
        expect(walletRequest.getLoginRequest).toBeDefined();
        expect(walletRequest.getDataSharingRequest).toBeDefined();
        expect(walletRequest.verify).toBeDefined();
        expect(walletRequest.toString).toBeDefined();
    });

    it('creates a LoginRequest with a did-key', async () => {
        const vc = await WalletRequestVerifiableCredential.signRequest(walletRequestPayload, issuer);
        const walletRequest = new WalletRequest(vc);

        expect(walletRequest.getDid()).toBe(issuer.did);
        expect(walletRequest.getLoginRequest()).toStrictEqual(request);
        expect(walletRequest.vc.getType()).toBe('WalletRequest');

        expect(await walletRequest.verify()).toBe(true);
        expect(walletRequest.toString().length).toBeGreaterThan(10);
    });
});

describe('WalletRequest class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;
    let walletRequestPayload: WalletRequestPayload;
    let walletRequest: WalletRequest;
    let myPublicKey: PublicKey;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        myPublicKey = publicKey;
        issuer = await toDidKeyIssuer(privateKey);

        request = {
            login: {
                randomString: randomString(32),
                origin: 'https://tonomy.foundation',
                publicKey: publicKey,
                callbackPath: '/callback',
            },
        };
        walletRequestPayload = {
            requests: [request],
        };
        const vc = await WalletRequestVerifiableCredential.signRequest(walletRequestPayload, issuer);

        walletRequest = new WalletRequest(vc);
    });

    test('Creates LoginRequest payload is object with PublicKey type', async () => {
        const loginRequestPayload = await walletRequest.getLoginRequest();

        expect(typeof loginRequestPayload).toBe('object');
        expect(loginRequestPayload.login.publicKey instanceof PublicKey).toBe(true);
        expect(loginRequestPayload.login.publicKey.toString()).toBe(myPublicKey.toString());
    });
});

describe('LoginRequestMessage class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;
    let walletRequestPayload: WalletRequestPayload;
    let walletRequest: WalletRequest;
    let myPublicKey: PublicKey;
    let loginRequestMessage: LoginRequestsMessage;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        myPublicKey = publicKey;
        issuer = await toDidKeyIssuer(privateKey);

        request = {
            login: {
                randomString: randomString(32),
                origin: 'https://tonomy.foundation',
                publicKey: publicKey,
                callbackPath: '/callback',
            },
        };
        walletRequestPayload = {
            requests: [request],
        };
        const vc = await WalletRequestVerifiableCredential.signRequest(walletRequestPayload, issuer);

        walletRequest = new WalletRequest(vc);
        const requests = new DualWalletRequests(walletRequest);

        loginRequestMessage = await LoginRequestsMessage.signMessage(requests, issuer, 'did:unknown');
    });

    test('Creates serialized LoginRequestMessage and can decode to get unserialized LoginRequest objects', async () => {
        const requests = await loginRequestMessage.getPayload();

        expect(requests).toBeInstanceOf(Object);
        expect(requests.external.getRequests()).toBeInstanceOf(Array);
        expect(requests.external.getRequests()).toBe(1);
        const request = requests.external.getLoginRequest();

        expect(request).toBeInstanceOf(Object);
        expect(request.login.publicKey).toBeInstanceOf(PublicKey);
        expect(request.login.publicKey.toString()).toBe(myPublicKey.toString());
    });
});
