import { KeyType, PrivateKey } from '@wharfkit/antelope';
import { resolveDidKey, toDidKey, toDidKeyIssuer } from '../../../src/sdk/util/ssi/did-key';
import { createVerifiableCredentialJwt, verifyCredential } from 'did-jwt-vc';
import { Resolver } from 'did-resolver';
import { getDidKeyResolver } from '@veramo/did-provider-key';

const resolvable = new Resolver({ ...getDidKeyResolver() });

describe('did-key resolver', () => {
    const privateKey = PrivateKey.generate(KeyType.K1);
    const publicKey = privateKey.toPublic();

    it('resolves correctly', async () => {
        expect.assertions(2);
        const did = await toDidKey(publicKey);

        // did:key:zQ3shTpVrjuSqTC8VADU1iwkgk3CinwvL9RdFFWxonyVzQZJD
        expect(did.length).toBe(57);
        const didDocument = await resolveDidKey(did);

        expect(didDocument.didDocument?.id).toBe(did);
    });

    it('signs a VC correctly', async () => {
        expect.assertions(1);
        const issuer = await toDidKeyIssuer(privateKey);
        const subject = {
            foo: 'bar',
        };
        const vc = await createVerifiableCredentialJwt(
            {
                sub: issuer.did,
                nbf: 123456,
                vc: {
                    '@context': 'https://www.w3.org/2018/credentials/v1',
                    type: ['VerifiableCredential'],
                    credentialSubject: subject,
                },
            },
            issuer
        );

        const verifiedVc = await verifyCredential(vc, resolvable);

        expect(verifiedVc.verified).toBe(true);
    });
});
