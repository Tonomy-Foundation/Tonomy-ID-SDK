import { PrivateKey, PublicKey } from '@wharfkit/antelope';
import { UserApps } from '../../src/sdk/controllers/userApps';
import { generateRandomKeyPair } from '../../src/sdk/util/crypto';
import URL from 'jsdom-url';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { LoginRequest } from '../../src/sdk/util/request';
import { objToBase64Url } from '../../src/sdk/util/base64';
import { setTestSettings } from '../../test-integration/helpers/settings';

// @ts-expect-error - URL type on global does not match
global.URL = URL;

setTestSettings();

describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const { loginRequest } = (await ExternalUser.loginWithTonomy({
            callbackPath: '/login',
            redirect: false,
        })) as LoginWithTonomyMessages;

        expect(typeof loginRequest.toString()).toBe('string');
    });

    it('checks login url', async () => {
        const { loginRequest } = (await ExternalUser.loginWithTonomy({
            callbackPath: '/login',
            redirect: false,
        })) as LoginWithTonomyMessages;
        const payload = {
            requests: [loginRequest],
        };
        const base64UrlPayload = objToBase64Url(payload);
        const url = 'http://localhost/login?payload=' + base64UrlPayload;

        jest.spyOn(document, 'referrer', 'get').mockReturnValue('http://localhost');

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url,
        });

        const result = await UserApps.onRedirectLogin();

        expect(result).toBeInstanceOf(LoginRequest);
        expect(result).toBeDefined();
        expect(typeof result.getPayload().randomString).toBe('string');
        expect(result.getPayload().publicKey).toBeInstanceOf(PublicKey);
        expect(result.getPayload().origin).toBe('http://localhost');
        expect(result.getPayload().callbackPath).toBe('/login');
    });
});
