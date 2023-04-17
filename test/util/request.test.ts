import { generateRandomKeyPair, randomString, setSettings } from '../../src/sdk';
import { createJWK } from '../../src/sdk/util/ssi/did-jwk';
import { ES256KSigner } from '@tonomy/did-jwt';
import { Issuer } from '@tonomy/did-jwt-vc';
import { toDid } from '../../src/sdk/util/ssi/did-jwk';
import { LoginRequest, LoginRequestPayload, Request } from '../../src/sdk/util/request';

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

    it('fails if it is created using the Request class', async () => {
        await expect(Request.sign<LoginRequestPayload>(request, issuer)).rejects.toThrow(
            'class should be a derived class of Request'
        );
    });

    it('Can be created using the different constructors', async () => {
        const loginRequest = await LoginRequest.sign(request, issuer);
        const newRequest = new Request(loginRequest);

        expect(newRequest.getType()).toBe('LoginRequest');
        const newLoginRequest = new LoginRequest(newRequest);

        expect(newLoginRequest.getType()).toBe('LoginRequest');
        const newLoginRequestFromVc = new LoginRequest(loginRequest.getVc());

        expect(newLoginRequestFromVc.getType()).toBe('LoginRequest');
    });

    it('creates a LoginRequest with the correct functions', async () => {
        const loginRequest = await LoginRequest.sign(request, issuer);

        expect(loginRequest).toBeDefined();
        expect(loginRequest.getVc).toBeDefined();
        expect(loginRequest.getSender).toBeDefined();
        expect(loginRequest.getPayload).toBeDefined();
        expect(loginRequest.getType).toBeDefined();
        expect(loginRequest.verify).toBeDefined();
        expect(loginRequest.toString).toBeDefined();
    });

    it('creates a LoginRequest with a did-jwk', async () => {
        const loginRequest = await LoginRequest.sign(request, issuer);

        expect(loginRequest.getSender()).toBe(issuer.did);
        expect(loginRequest.getPayload()).toStrictEqual(request);
        expect(loginRequest.getType()).toBe('LoginRequest');

        expect(await loginRequest.verify()).toBe(true);
        expect(loginRequest.toString().length).toBeGreaterThan(10);
    });
});
