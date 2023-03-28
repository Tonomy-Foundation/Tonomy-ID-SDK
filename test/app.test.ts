import { PrivateKey, PublicKey } from '@greymass/eosio';
import { UserApps } from '../src/userApps';
import { generateRandomKeyPair } from '../src/util/crypto';
import URL from 'jsdom-url';
import { JsKeyManager } from './services/jskeymanager';
import { Message } from '../src/util/message';
import { setSettings } from '../src';
import { ExternalUser } from '../src/externalUser';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.URL = URL;
setSettings({});

describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const keymanager = new JsKeyManager();
        const jwt = await ExternalUser.loginWithTonomy({ callbackPath: '/login', redirect: false }, keymanager);

        expect(jwt).toBeDefined();
    });

    it('checks login url', async () => {
        const keymanager = new JsKeyManager();
        const jwt = await ExternalUser.loginWithTonomy({ callbackPath: '/login', redirect: false }, keymanager);
        const url = 'http://localhost/login?requests=' + JSON.stringify([jwt]);

        jest.spyOn(document, 'referrer', 'get').mockReturnValue('http://localhost');

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url,
        });

        const result = await UserApps.onRedirectLogin();

        expect(result).toBeInstanceOf(Message);
        expect(result).toBeDefined();
        expect(typeof result.getPayload().randomString).toBe('string');
        expect(typeof result.getPayload().publicKey).toBe('string');
        expect(result.getPayload().origin).toBe('http://localhost');
        expect(result.getPayload().callbackPath).toBe('/login');
    });
});
