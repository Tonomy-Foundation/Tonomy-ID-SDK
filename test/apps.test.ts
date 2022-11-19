import { PrivateKey, PublicKey } from '@greymass/eosio';
import { generateRandomKeyPair, onPressLogin, toDidDocument } from '../src/app';
import { verifyJWT } from 'did-jwt';
import * as jose from 'jose';
describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();
        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const redirect = '/login/test';
        const jwt = await onPressLogin(redirect);
        expect(jwt).toBeDefined();
    });

    it('verifies created jwt', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resolve = (did: any) => {
            const decoded = jose.base64url.decode(did.split(':').pop().split('#')[0]);
            const jwk = JSON.parse(decoded.toString());
            return toDidDocument(jwk);
        };
        const redirect = '/login/test';
        const jwt = await onPressLogin(redirect);

        expect(jwt).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // TODO: add support JsonWebKey2020 for ES256K-R
        const verify = await verifyJWT(jwt, { resolver: { resolve: resolve as any } });

        expect(verify).toBeDefined();
    });
});
