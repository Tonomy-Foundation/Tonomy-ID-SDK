/**
 * @jest-environment jsdom
 */
import { PrivateKey, PublicKey } from '@wharfkit/antelope';
import { generateRandomKeyPair } from '../../src/sdk/util/crypto';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { onRedirectLogin } from '../../src/sdk/helpers/urls';
import { setReferrer, setUrl } from '../helpers/browser';

describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const { requests } = (await ExternalUser.loginWithTonomy({
            callbackPath: '/login',
            redirect: false,
        })) as LoginWithTonomyMessages;

        expect(typeof requests.toString()).toBe('string');
    });

    it('checks login url', async () => {
        const appOrigin = 'http://app.com';
        const ssoOrigin = 'http://sso.com';

        setUrl(appOrigin);
        const { requests: walletRequests } = (await ExternalUser.loginWithTonomy({
            callbackPath: '/login',
            redirect: false,
        })) as LoginWithTonomyMessages;
        const url = ssoOrigin + '/login?payload=' + walletRequests.toString();

        setReferrer(appOrigin);
        setUrl(url);

        const requests = await onRedirectLogin();

        expect(requests).toBeDefined();

        const receivedLoginRequest = requests.external.getLoginRequest();

        expect(typeof receivedLoginRequest.login.randomString).toBe('string');
        expect(receivedLoginRequest.login.publicKey).toBeInstanceOf(PublicKey);
        expect(receivedLoginRequest.login.origin).toBe(appOrigin);
        expect(receivedLoginRequest.login.callbackPath).toBe('/login');
    });
});
