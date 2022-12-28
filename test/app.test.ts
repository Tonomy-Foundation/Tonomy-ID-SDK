import { PrivateKey, PublicKey } from '@greymass/eosio';
import UserApps from '../src/userApps';
import { generateRandomKeyPair } from '../src/util/crypto';
import URL from 'jsdom-url';

describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();
        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const jwt = await UserApps.onPressLogin({ callbackPath: '/login', redirect: false });
        expect(jwt).toBeDefined();
    });

    it('checks login url', async () => {
        const jwt = await UserApps.onPressLogin({ callbackPath: '/login', redirect: false });
        const url = 'http://localhost/login?jwt=' + jwt;

        jest.spyOn(document, 'referrer', 'get').mockReturnValue('http://localhost');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url,
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        global.URL = URL;

        const result = await UserApps.onRedirectLogin();
        expect(result).toBeDefined();
        expect(typeof result.payload.randomString).toBe('string');
        expect(typeof result.payload.publicKey).toBe('string');
        expect(result.payload.origin).toBe('http://localhost');
        expect(result.payload.callbackPath).toBe('/login');
    });
});
