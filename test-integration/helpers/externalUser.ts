/* eslint-disable no-console */
import { Name, API } from '@wharfkit/antelope';
import {
    AccountType,
    App,
    Communication,
    IdentifyMessage,
    KeyManager,
    LinkAuthRequestMessage,
    LoginRequestResponseMessage,
    LoginRequestsMessage,
    StorageFactory,
    Subscriber,
    TonomyUsername,
    User,
    UserApps,
    getAccountNameFromUsername,
    getSettings,
} from '../../src/sdk';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { LoginRequest } from '../../src/sdk/util/request';
import { objToBase64Url } from '../../src/sdk/util/base64';
import { VerifiableCredential } from '../../src/sdk/util/ssi/vc';
import { getAccount } from '../../src/sdk/services/blockchain';

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

    expect(typeof loginRequest.toString()).toBe('string');

    const did = loginRequest.getIssuer();

    expect(did).toContain('did:jwk:');

    if (log) console.log('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

    const payload = {
        requests: [loginRequest],
    };
    const base64UrlPayload = objToBase64Url(payload);
    const redirectUrl = loginAppOrigin + '/login?payload=' + base64UrlPayload;

    return { did, redirectUrl };
}

export async function externalWebsiteUserPressLoginToTonomyButtonRequestDataSharing(
    keyManager: KeyManager,
    loginAppOrigin: string,
    log = false
) {
    if (log) console.log('EXTERNAL_WEBSITE/login: create did:jwk and login request with data sharing');

    const { loginRequest } = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false, dataRequest: { username: true } },
        keyManager
    )) as LoginWithTonomyMessages;

    expect(typeof loginRequest.toString()).toBe('string');

    const did = loginRequest.getIssuer();

    expect(did).toContain('did:jwk:');

    if (log) console.log('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

    const payload = {
        requests: [loginRequest],
    };
    const base64UrlPayload = objToBase64Url(payload);
    const redirectUrl = loginAppOrigin + '/login?payload=' + base64UrlPayload;

    return { did, redirectUrl };
}

export async function loginWebsiteOnRedirect(externalWebsiteDid: string, keyManager: KeyManager, log = false) {
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

    const externalLoginRequest = await UserApps.onRedirectLogin();

    expect(externalLoginRequest.getIssuer()).toBe(externalWebsiteDid);

    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: create did:jwk and login request');
    const { loginRequest, loginToCommunication } = (await ExternalUser.loginWithTonomy(
        { callbackPath: '/callback', redirect: false },
        keyManager
    )) as LoginWithTonomyMessages;
    const did = loginRequest.getIssuer();

    expect(did).toContain('did:jwk:');
    expect(did).not.toEqual(externalWebsiteDid);

    const jwtRequests = [loginRequest, externalLoginRequest];

    // Login to the Tonomy Communication as the login app user
    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
    const communication = new Communication(false);
    const loginResponse = await communication.login(loginToCommunication);

    expect(loginResponse).toBe(true);

    return { did, jwtRequests, communication };
}

export async function setupTonomyIdIdentifySubscriber(did: string, log = false) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            const receivedIdentifyMessage = new IdentifyMessage(receivedMessage);

            expect(receivedIdentifyMessage.getSender()).toContain(did);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive connection acknowledgement from Tonomy ID');
            resolve(receivedIdentifyMessage);
        };
    };

    const promise = new Promise<IdentifyMessage>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function setupTonomyIdRequestConfirmSubscriber(did: string, log = false) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            const loginRequestResponseMessage = new LoginRequestResponseMessage(receivedMessage);

            expect(loginRequestResponseMessage.getSender()).toContain(did);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: receive receipt of login request from Tonomy ID');
            // we receive a message after Tonomy ID user confirms consent to the login request
            resolve(loginRequestResponseMessage);
        };
    };

    const promise = new Promise<LoginRequestResponseMessage>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function sendLoginRequestsMessage(
    requests: LoginRequest[],
    keyManager: KeyManager,
    communication: Communication,
    recipientDid: string,
    log = false
) {
    const jwkIssuer = await UserApps.getJwkIssuerFromStorage(keyManager);

    const loginRequestMessage = await LoginRequestsMessage.signMessage({ requests }, jwkIssuer, recipientDid);

    if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending login request to Tonomy ID app');
    const sendMessageResponse = await communication.sendMessage(loginRequestMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function loginWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory, log = true) {
    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: fetching response from URL and verifying login');
    const externalUser = await ExternalUser.verifyLoginRequest({
        keyManager,
        storageFactory,
    });

    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: checking login request of external website');
    const { requests } = await UserApps.getLoginRequestFromUrl();
    const result = await UserApps.verifyRequests(requests);
    const redirectJwt = result.find((jwtVerified) => jwtVerified.getPayload().origin !== location.origin);

    expect(redirectJwt).toBeDefined();

    if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: redirecting to external website');

    const username = await externalUser.getUsername();
    const accountName = await externalUser.getAccountName();

    return { redirectJwt: redirectJwt as LoginRequest, username, accountName };
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

    return externalUser;
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
    return externalUser;
}

export async function externalWebsiteSignVc(externalUser: ExternalUser, log = false) {
    if (log) console.log('EXTERNAL_WEBSITE/sign-vc: signing verifiable credential');

    const vcData = {
        name: 'Joe',
        dob: new Date('1990-01-01').toISOString(),
    };
    const signedVc = await externalUser.signVc('did:example:id:1234', 'ExampleCredential', vcData);

    expect(signedVc).toBeDefined();
    expect(signedVc.getIssuer()).toBe(await externalUser.getDid());
    expect(signedVc.getIssuer().includes('did:antelope:')).toBe(true);
    expect(signedVc.getCredentialSubject()).toEqual(vcData);
    const verifiedVc = await signedVc.verify();

    expect(verifiedVc.verified).toBe(true);

    const jwt = signedVc.toString();
    const constructedVc = new VerifiableCredential(jwt);
    const verifiedConstructedVc = await constructedVc.verify();

    expect(verifiedConstructedVc.verified).toBe(true);
}

async function getLinkedActionsForPermission(
    accountName: Name,
    permissionName: Name
): Promise<API.v1.AccountLinkedAction> {
    const accountObject = await getAccount(accountName);
    const accountAppPermission = accountObject.permissions.find((permission) =>
        permission.perm_name.equals(permissionName)
    );

    if (!accountAppPermission) throw new Error(`Permission ${permissionName} not found for account ${accountName}`);
    return accountAppPermission.linked_actions[0];
}

export async function externalWebsiteSignTransaction(externalUser: ExternalUser, externalApp: App, log = false) {
    const from = await externalUser.getAccountName();
    const to = await getAccountNameFromUsername(
        TonomyUsername.fromUsername('lovesboost', AccountType.PERSON, getSettings().accountSuffix)
    );

    let linkedActions = await getLinkedActionsForPermission(from, externalApp.accountName);

    expect(linkedActions).toBeUndefined();

    if (log) console.log('EXTERNAL_WEBSITE/sign-trx: signing transaction selfissue()');
    let trx = await externalUser.signTransaction('eosio.token', 'selfissue', {
        to: from,
        quantity: '10 SYS',
        memo: 'test',
    });

    linkedActions = await getLinkedActionsForPermission(from, externalApp.accountName);

    expect(linkedActions).toBeDefined();
    expect(linkedActions.account.equals('eosio.token')).toBe(true);
    expect(linkedActions.action).toBeNull();

    if (log) console.log('EXTERNAL_WEBSITE/sign-trx: signing transaction transfer()');
    trx = await externalUser.signTransaction('eosio.token', 'transfer', {
        from,
        to,
        quantity: '1 SYS',
        memo: 'test',
    });

    expect(trx).toBeDefined();
    expect(typeof trx.transaction_id).toBe('string');
    expect(trx.processed.receipt.status).toBe('executed');
    // TODO check action trace for action and the link auth

    if (log) console.log('EXTERNAL_WEBSITE/sign-trx: signing transaction transfer() again)');
    trx = await externalUser.signTransaction('eosio.token', 'transfer', {
        from,
        to,
        quantity: '2 SYS',
        memo: 'test',
    });

    expect(trx).toBeDefined();
    expect(typeof trx.transaction_id).toBe('string');
    expect(trx.processed.receipt.status).toBe('executed');
    // TODO check action trace for action and the does not contain link auth
}

export async function setupLinkAuthSubscriber(user: User, log = false): Promise<void> {
    // Setup a promise that resolves when the subscriber executes
    // This emulates the Tonomy ID app, which waits for LinkAuth requests and executes them
    return new Promise<void>((resolve, reject) => {
        user.communication.subscribeMessage(async (message) => {
            if (log) console.log('TONOMY_ID/storage: LinkAuth request received');

            try {
                await user.handleLinkAuthRequestMessage(message);
                resolve();
            } catch (e) {
                reject(e);
            }
        }, LinkAuthRequestMessage.getType());

        setTimeout(() => reject(new Error('LinkAuth request not received')), 5000);
    });
}

export async function externalWebsiteOnLogout(keyManager: KeyManager, storageFactory: StorageFactory) {
    const externalUser = await ExternalUser.getUser({ keyManager, storageFactory });

    await externalUser.logout();
    expect(await externalUser.getAccountName()).toBe(undefined);
}
