import { PrivateKey, PublicKey } from '@wharfkit/antelope';
import { generateRandomKeyPair } from '../../src/sdk/util/crypto';
import URL from 'jsdom-url';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { LoginRequestPayload } from '../../src/sdk/util/request';
import { objToBase64Url } from '../../src/sdk/util/base64';
import { setTestSettings } from '../helpers/settings';
import { onRedirectLogin } from '../../src/sdk/helpers/urls';

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
        const { loginRequest, dataSharingRequest } = (await ExternalUser.loginWithTonomy({
            callbackPath: '/login',
            redirect: false,
        })) as LoginWithTonomyMessages;
        const payload = {
            requests: [loginRequest, dataSharingRequest],
        };
        const base64UrlPayload = objToBase64Url(payload);
        const url = 'http://localhost/login?payload=' + base64UrlPayload;

        jest.spyOn(document, 'referrer', 'get').mockReturnValue('http://localhost');

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url,
        });

        const requests = await onRedirectLogin();

        expect(requests).toBeDefined();

        const receivedLoginRequest = requests.getRequests()[0].getPayload() as LoginRequestPayload;

        expect(typeof receivedLoginRequest.randomString).toBe('string');
        expect(receivedLoginRequest.publicKey).toBeInstanceOf(PublicKey);
        expect(receivedLoginRequest.origin).toBe('http://localhost');
        expect(receivedLoginRequest.callbackPath).toBe('/login');
    });
});
