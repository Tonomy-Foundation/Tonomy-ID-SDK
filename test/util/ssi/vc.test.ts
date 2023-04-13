import { decodeJWT, verifyJWT } from '@tonomy/did-jwt';
import { VerificationMethod } from '@tonomy/did-resolver';
import { VerifiableCredential } from '../../../src/sdk/util/ssi/vc';
import { generateRandomKeyPair, randomString, setSettings } from '../../../src/sdk';
import { createJWK } from '../../../src/sdk/util/ssi/did-jwk';
import { ES256KSigner } from '@tonomy/did-jwt';
import { Issuer } from '@tonomy/did-jwt-vc';
import { toDid } from '../../../src/sdk/util/ssi/did-jwk';

type TestObject = {
    name: string;
    dob: number;
};

setSettings({});

describe('VerifiableCredential class', () => {
    let vc: VerifiableCredential;
    let issuer: Issuer;
    const id = randomString(6);
    const credentialSubject = { name: 'test', dob: 3 };

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

    it('creates a VC with a did-jwk', async () => {
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
