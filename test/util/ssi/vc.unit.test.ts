import { VerifiableCredential, VerifiableCredentialWithType } from '../../../src/sdk/util/ssi/vc';
import { generateRandomKeyPair, randomString } from '../../../src/sdk';
import { Issuer } from 'did-jwt-vc';
import { LoginRequest, LoginRequestPayload } from '../../../src/sdk/util/request';
import { toDidKeyIssuer } from '../../../src/sdk/util/ssi/did-key';

type TestObject = {
    name: string;
    dob: number;
};

describe('VerifiableCredential class', () => {
    let vc: VerifiableCredential;
    let issuer: Issuer;
    const id = randomString(6);
    const credentialSubject = { name: 'test', dob: 3 };

    beforeEach(async () => {
        const { privateKey } = generateRandomKeyPair();

        issuer = await toDidKeyIssuer(privateKey);

        vc = await VerifiableCredential.sign<TestObject>(id, ['VerifiableCredential'], credentialSubject, issuer);
    });

    it('creates a VC with the correct functions', async () => {
        expect(vc).toBeDefined();
        expect(vc.getPayload).toBeDefined();
        expect(vc.getVc).toBeDefined();
        expect(vc.getCredentialSubject).toBeDefined();
        expect(vc.getIssuer).toBeDefined();
        expect(vc.getSubject).toBeDefined();
        expect(vc.getId).toBeDefined();
        expect(vc.getAudience).toBeDefined();
        expect(vc.getExpiration).toBeDefined();
        expect(vc.getIssuedAt).toBeDefined();
        expect(vc.getNotBefore).toBeDefined();
        expect(vc.verify).toBeDefined();
        expect(vc.toString).toBeDefined();
    });

    it('creates a VC with a did-key', async () => {
        expect(vc).toBeDefined();
        expect(vc.getPayload().iss).toBe(issuer.did);
        expect(vc.getPayload().jti).toBe(id);
        expect(vc.getVc().credentialSubject).toStrictEqual(credentialSubject);
        expect(vc.getCredentialSubject()).toStrictEqual(credentialSubject);
        expect(vc.getIssuer()).toBe(issuer.did);
        expect(vc.getSubject()).not.toBeDefined();
        expect(vc.getId()).toBe(id);
        expect(vc.getAudience()).not.toBeDefined();
        expect(vc.getExpiration()).not.toBeDefined();
        expect(vc.getIssuedAt()).not.toBeDefined();
        const notBefore = vc.getNotBefore();
        const now = new Date().getSeconds();

        expect(notBefore).toBeDefined();

        expect(notBefore?.getSeconds()).toBeGreaterThan(now - 20);
        expect(notBefore?.getSeconds()).toBeLessThan(now + 20);

        expect((await vc.verify()).verified).toBe(true);
        expect(vc.toString().length).toBeGreaterThan(10);
    });
});

describe('VerifiableCredentialWithType class', () => {
    let issuer: Issuer;
    let request: LoginRequestPayload;

    beforeEach(async () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        issuer = await toDidKeyIssuer(privateKey);

        request = {
            randomString: randomString(32),
            origin: 'https://tonomy.foundation',
            publicKey: publicKey,
            callbackPath: '/callback',
        };
    });

    it('fails if it is created using the VerifiableCredentialWithType class', async () => {
        // @ts-expect-error sign is protected
        await expect(VerifiableCredentialWithType.sign<LoginRequestPayload>(request, issuer)).rejects.toThrow(
            'class should be a derived class of VerifiableCredentialWithType'
        );
    });

    it('Can be created using the different constructors', async () => {
        const loginRequest = await LoginRequest.signRequest(request, issuer);
        const newRequest = new VerifiableCredentialWithType(loginRequest);

        expect(newRequest.getType()).toBe('LoginRequest');

        const newLoginRequest = new LoginRequest(newRequest);

        expect(newLoginRequest.getType()).toBe('LoginRequest');

        const newLoginRequestFromVc = new LoginRequest(loginRequest.getVc());

        expect(newLoginRequestFromVc.getType()).toBe('LoginRequest');
    });
});
