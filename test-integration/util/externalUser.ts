/* eslint-disable no-console */
import { Communication, ExternalUser, KeyManager, Message, Subscriber, UserApps } from '../../src';

export async function externalWebsiteUserPressLoginToTonomyButton(
    keyManager: KeyManager,
    loginAppOrigin: string,
    log = false
) {
    if (log) console.log('EXTERNAL_WEBSITE/login: create did:jwk and login request');

    const loginRequestJwt = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false },
        keyManager
    )) as string;

    expect(typeof loginRequestJwt).toBe('string');

    const did = new Message(loginRequestJwt).getSender();

    expect(did).toContain('did:jwk:');

    if (log) console.log('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

    const redirectUrl = loginAppOrigin + '/login?requests=' + JSON.stringify([loginRequestJwt]);

    return { did, redirectUrl };
}

export async function loginWebsiteOnRedirect(externalWebsiteDid: string, keyManager: KeyManager, log = false) {
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

    const jwtVerified = await UserApps.onRedirectLogin();

    expect(jwtVerified.getSender()).toBe(externalWebsiteDid);

    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: create did:jwk and login request');
    const loginRequestJwt = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false },
        keyManager
    )) as string;
    const did = new Message(loginRequestJwt).getSender();

    expect(did).toContain('did:jwk:');
    expect(did).not.toEqual(externalWebsiteDid);

    const jwtRequests = [loginRequestJwt, jwtVerified.jwt];

    // Create a new login message, and take the DID (did:jwk) out as their identity
    // Tonomy ID will scan the DID in barcode and use connect
    const loginMessage = new Message(loginRequestJwt);

    // Login to the Tonomy Communication as the login app user
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
    const communication = new Communication();
    const loginResponse = await communication.login(loginMessage);

    expect(loginResponse).toBe(true);

    return { did, jwtRequests, communication };
}

export async function setupTonomyIdAckSubscriber(did: string, log = false) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (responseMessage: any) => {
            const receivedMessage = new Message(responseMessage);

            expect(receivedMessage.getSender()).toContain(did);

            if (receivedMessage.getPayload().type === 'ack') {
                if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive connection acknowledgement from Tonomy ID');
                // we receive the ack message after Tonomy ID scans our QR code
                resolve({ message: receivedMessage, type: 'ack' });
            } else {
                if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive receipt of login request from Tonomy ID');
                // we receive a message after Tonomy ID user confirms consent to the login request
                resolve({ message: receivedMessage, type: 'request' });
                // reject();
            }
        };
    };

    const promise = new Promise<{
        type: string;
        message: Message;
    }>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}
