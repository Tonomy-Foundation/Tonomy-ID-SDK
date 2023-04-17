/* eslint-disable no-console */
import { Name } from '@greymass/eosio';
import {
    Communication,
    KeyManager,
    Message,
    MessageType,
    StorageFactory,
    Subscriber,
    User,
    UserApps,
} from '../../src/sdk';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';

export async function externalWebsiteUserPressLoginToTonomyButton(
    keyManager: KeyManager,
    loginAppOrigin: string,
    log = false
) {
    if (log) console.log('EXTERNAL_WEBSITE/login: create did:jwk and login request');

    const { loginRequest } = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false },
        keyManager
    )) as LoginWithTonomyMessages;

    expect(typeof loginRequest.jwt).toBe('string');

    const did = loginRequest.getSender();

    expect(did).toContain('did:jwk:');

    if (log) console.log('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

    const redirectUrl = loginAppOrigin + '/login?requests=' + JSON.stringify([loginRequest.jwt]);

    return { did, redirectUrl };
}

export async function loginWebsiteOnRedirect(externalWebsiteDid: string, keyManager: KeyManager, log = false) {
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

    const jwtVerified = await UserApps.onRedirectLogin();

    expect(jwtVerified.getSender()).toBe(externalWebsiteDid);

    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: create did:jwk and login request');
    const { loginRequest, loginToCommunication } = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false },
        keyManager
    )) as LoginWithTonomyMessages;
    const did = loginRequest.getSender();

    expect(did).toContain('did:jwk:');
    expect(did).not.toEqual(externalWebsiteDid);

    const jwtRequests = [loginRequest.jwt, jwtVerified.jwt];

    // Login to the Tonomy Communication as the login app user
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
    const communication = new Communication();
    const loginResponse = await communication.login(loginToCommunication);

    expect(loginResponse).toBe(true);

    return { did, jwtRequests, communication };
}

export async function setupTonomyIdIdentifySubscriber(did: string, log = false) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            expect(receivedMessage.getSender()).toContain(did);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive connection acknowledgement from Tonomy ID');
            resolve({ message: receivedMessage });
        };
    };

    const promise = new Promise<{
        type: string;
        message: Message;
    }>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function setupTonomyIdRequestConfirmSubscriber(did: string, log = false) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            expect(receivedMessage.getSender()).toContain(did);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive receipt of login request from Tonomy ID');
            // we receive a message after Tonomy ID user confirms consent to the login request
            resolve({ message: receivedMessage });
        };
    };

    const promise = new Promise<{
        type: string;
        message: Message;
    }>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function sendLoginRequestsMessage(
    requests: string[],
    keyManager: KeyManager,
    communication: Communication,
    recipientDid: string,
    log = false
) {
    // then send a Message with the two signed requests, this will be received by the Tonomy ID app
    const requestMessage = await ExternalUser.signMessage(
        {
            requests: JSON.stringify(requests),
        },
        { keyManager, recipient: recipientDid, type: MessageType.LOGIN_REQUEST }
    );

    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending login request to Tonomy ID app');
    const sendMessageResponse = await communication.sendMessage(requestMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function loginWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory, log = true) {
    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: fetching response from URL and verifying login');
    const externalUser = await ExternalUser.verifyLoginRequest({
        keyManager,
        storageFactory,
    });

    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: checking login request of external website');
    const { requests } = await UserApps.getLoginRequestParams();
    const result = await UserApps.verifyRequests(requests);

    const redirectJwt = result.find((jwtVerified) => jwtVerified.getPayload().origin !== location.origin);

    expect(redirectJwt).toBeDefined();

    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: redirecting to external website');

    const username = (await externalUser.getUsername()).username;
    const accountName = await externalUser.getAccountName();

    return { redirectJwt, username, accountName };
}

export async function externalWebsiteOnCallback(
    keyManager: KeyManager,
    storageFactory: StorageFactory,
    accountName: Name,
    log = true
) {
    if (log) console.log('EXTERNAL_WEBSITE/callback: fetching response from URL');
    const externalUser = await ExternalUser.verifyLoginRequest({
        keyManager,
        storageFactory,
    });

    const externalWebsiteAccount = await externalUser.getAccountName();
    const tonomyIdAccount = accountName;

    expect(externalWebsiteAccount.toString()).toBe(tonomyIdAccount.toString());
}

export async function externalWebsiteOnReload(
    keyManager: KeyManager,
    storageFactory: StorageFactory,
    tonomyUser: User,
    log = false
) {
    if (log) console.log('EXTERNAL_WEBSITE/home: calling get User');

    const externalUser = await ExternalUser.getUser({ keyManager, storageFactory });

    expect(externalUser).toBeDefined();
    expect((await externalUser.getAccountName()).toString()).toBe(await (await tonomyUser.getAccountName()).toString());
}