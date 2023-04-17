import { generateRandomKeyPair, randomString, setSettings } from '../../src/sdk';
import { createJWK } from '../../src/sdk/util/ssi/did-jwk';
import { ES256KSigner } from '@tonomy/did-jwt';
import { Issuer } from '@tonomy/did-jwt-vc';
import { toDid } from '../../src/sdk/util/ssi/did-jwk';
import { LoginRequest, LoginRequestPayload } from '../../src/sdk/util/request';

setSettings({});

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
            publicKey: publicKey.toString(),
            callbackPath: '/callback',
        };
    });

    it('creates a LoginRequest with the correct functions', async () => {
        const loginRequest = await LoginRequest.sign(request, issuer);

        expect(loginRequest).toBeDefined();
        expect(loginRequest.getVc).toBeDefined();
        expect(loginRequest.getIssuer).toBeDefined();
        expect(loginRequest.getPayload).toBeDefined();
        expect(loginRequest.getType).toBeDefined();
        expect(loginRequest.verify).toBeDefined();
        expect(loginRequest.toString).toBeDefined();
    });

    it('creates a LoginRequest with a did-jwk', async () => {
        const loginRequest = await LoginRequest.sign(request, issuer);

        expect(loginRequest.getIssuer()).toBe(issuer.did);
        expect(loginRequest.getPayload()).toStrictEqual(request);
        expect(loginRequest.getType()).toBe('LoginRequest');

        expect(await loginRequest.verify()).toBe(true);
        expect(loginRequest.toString().length).toBeGreaterThan(10);
    });
});
