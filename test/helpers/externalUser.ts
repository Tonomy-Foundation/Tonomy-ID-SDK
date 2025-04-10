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
    getAccountNameFromUsername,
    getSettings,
    WalletRequest,
    LoginRequestsMessagePayload,
    IOnPressLoginOptions,
    ResponsesManager,
    verifyClientAuthorization,
    ClientAuthorizationData,
} from '../../src/sdk';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { objToBase64Url } from '../../src/sdk/util/base64';
import { VerifiableCredential } from '../../src/sdk/util/ssi/vc';
import { getAccount } from '../../src/sdk/services/blockchain';
import { getDidKeyIssuerFromStorage } from '../../src/sdk/helpers/didKeyStorage';
import { getLoginRequestResponseFromUrl, onRedirectLogin } from '../../src/sdk/helpers/urls';
import { ExternalUserLoginTestOptions } from '../externalUser.integration.test';
import { IUserPublic } from './user';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:helpers:externalUser');

export async function externalWebsiteUserPressLoginToTonomyButton(
    keyManager: KeyManager,
    loginAppOrigin: string,
    testOptions: ExternalUserLoginTestOptions
) {
    debug('EXTERNAL_WEBSITE/login: create did:key and login request');

    const onPressLoginOptions: IOnPressLoginOptions = {
        callbackPath: '/callback',
        redirect: false,
    };

    if (testOptions.dataRequest) {
        onPressLoginOptions.dataRequest = {};

        if (testOptions.dataRequestUsername) onPressLoginOptions.dataRequest.username = true;
    }

    const { loginRequest, dataSharingRequest } = (await ExternalUser.loginWithTonomy(
        onPressLoginOptions,
        keyManager
    )) as LoginWithTonomyMessages;

    expect(typeof loginRequest.toString()).toBe('string');

    const did = loginRequest.getIssuer();

    expect(did).toContain('did:key:');

    debug('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

    const payload: LoginRequestsMessagePayload = {
        requests: [loginRequest],
    };

    if (dataSharingRequest) payload.requests.push(dataSharingRequest);

    const base64UrlPayload = objToBase64Url(payload);
    const redirectUrl = loginAppOrigin + '/login?payload=' + base64UrlPayload;

    return { did, redirectUrl };
}

export async function loginWebsiteOnRedirect(
    externalWebsiteDid: string,
    keyManager: KeyManager
): Promise<{
    did: string;
    requests: WalletRequest[];
    communication: Communication;
}> {
    debug('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

    const managedExternalRequests = await onRedirectLogin();

    debug('TONOMY_LOGIN_WEBSITE/login: create did:key and login request');

    const { loginRequest, dataSharingRequest, loginToCommunication } = (await ExternalUser.loginWithTonomy(
        {
            callbackPath: '/callback',
            redirect: false,
            dataRequest: {
                username: true,
            },
        },
        keyManager
    )) as LoginWithTonomyMessages;
    const did = loginRequest.getIssuer();

    expect(did).toContain('did:key:');
    expect(did).not.toEqual(externalWebsiteDid);

    const requests: WalletRequest[] = [...managedExternalRequests.getRequests(), loginRequest];

    if (dataSharingRequest) requests.push(dataSharingRequest);

    // Login to the Tonomy Communication as the login app user
    debug('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
    const communication = new Communication(false);
    const loginResponse = await communication.login(loginToCommunication);

    expect(loginResponse).toBe(true);

    return { did, requests, communication };
}

export async function setupTonomyIdIdentifySubscriber(did: string) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            const receivedIdentifyMessage = new IdentifyMessage(receivedMessage);

            expect(receivedIdentifyMessage.getSender()).toContain(did);

            debug('TONOMY_LOGIN_WEBSITE/login: receive connection acknowledgement from Tonomy ID');
            resolve(receivedIdentifyMessage);
        };
    };

    const promise = new Promise<IdentifyMessage>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function setupTonomyIdRequestConfirmSubscriber(did: string) {
    let subscriber: Subscriber;
    const subscriberExecutor = (resolve: any) => {
        subscriber = (receivedMessage) => {
            const loginRequestResponseMessage = new LoginRequestResponseMessage(receivedMessage);

            expect(loginRequestResponseMessage.getSender()).toContain(did);

            debug('TONOMY_LOGIN_WEBSITE/login: receive receipt of login request from Tonomy ID');
            // we receive a message after Tonomy ID user confirms consent to the login request
            resolve(loginRequestResponseMessage);
        };
    };

    const promise = new Promise<LoginRequestResponseMessage>(subscriberExecutor);

    // @ts-expect-error - subscriber is used before being assigned
    return { subscriber, promise };
}

export async function sendLoginRequestsMessage(
    requests: WalletRequest[],
    keyManager: KeyManager,
    communication: Communication,
    recipientDid: string
) {
    const didKeyIssuer = await getDidKeyIssuerFromStorage(keyManager);

    const loginRequestMessage = await LoginRequestsMessage.signMessage({ requests }, didKeyIssuer, recipientDid);

    debug('TONOMY_LOGIN_WEBSITE/login: sending login request to Tonomy ID app');
    const sendMessageResponse = await communication.sendMessage(loginRequestMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function loginWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory) {
    debug('TONOMY_LOGIN_WEBSITE/callback: fetching response from URL and verifying login');
    const externalUser = await ExternalUser.verifyLoginRequest({
        keyManager,
        storageFactory,
    });

    debug('TONOMY_LOGIN_WEBSITE/callback: checking login request of external website');
    const { response } = await getLoginRequestResponseFromUrl();

    if (!response) throw new Error('Login request response not found');
    const managedResponses = new ResponsesManager(response);

    await managedResponses.verify();
    await managedResponses.fetchMeta({ accountName: await externalUser.getAccountName() });

    const externalLoginRequest = managedResponses.getLoginResponseWithDifferentOriginOrThrow().getRequest();

    debug('TONOMY_LOGIN_WEBSITE/callback: redirecting to external website');

    return { externalLoginRequest, managedResponses };
}

export async function externalWebsiteOnCallback(
    keyManager: KeyManager,
    storageFactory: StorageFactory,
    accountName: Name
) {
    debug('EXTERNAL_WEBSITE/callback: fetching response from URL');
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
    tonomyUser: IUserPublic
) {
    debug('EXTERNAL_WEBSITE/home: calling get User');

    const externalUser = await ExternalUser.getUser({ keyManager, storageFactory });

    expect(externalUser).toBeDefined();
    expect((await externalUser.getAccountName()).toString()).toBe(await (await tonomyUser.getAccountName()).toString());
    return externalUser;
}

export async function externalWebsiteSignVc(externalUser: ExternalUser) {
    debug('EXTERNAL_WEBSITE/sign-vc: signing verifiable credential');

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

export async function externalWebsiteSignTransaction(externalUser: ExternalUser, externalApp: App) {
    const from = await externalUser.getAccountName();
    const to = await getAccountNameFromUsername(
        TonomyUsername.fromUsername('lovesboost', AccountType.PERSON, getSettings().accountSuffix)
    );

    let linkedActions = await getLinkedActionsForPermission(from, externalApp.accountName);

    expect(linkedActions).toBeDefined();
    expect(linkedActions.account.equals(externalApp.accountName)).toBe(true);
    expect(linkedActions.action).toBeNull();

    debug(
        `EXTERNAL_WEBSITE/sign-trx: signing transaction selfissue() from ${from.toString()} with app ${externalApp.accountName.toString()}`
    );

    let trx = await externalUser.signTransaction(externalApp.accountName, 'selfissue', {
        to: from,
        quantity: `10.000000 ${getSettings().currencySymbol}`,
        memo: 'test',
    });

    linkedActions = await getLinkedActionsForPermission(from, externalApp.accountName);

    expect(linkedActions).toBeDefined();
    expect(linkedActions.account.equals(externalApp.accountName)).toBe(true);
    expect(linkedActions.action).toBeNull();

    debug('EXTERNAL_WEBSITE/sign-trx: signing transaction transfer()');
    trx = await externalUser.signTransaction(externalApp.accountName, 'transfer', {
        from,
        to,
        quantity: `1.000000 ${getSettings().currencySymbol}`,
        memo: 'test',
    });

    expect(trx).toBeDefined();
    expect(typeof trx.transaction_id).toBe('string');
    expect(trx.processed.receipt.status).toBe('executed');
    // TODO: check action trace for action and the link auth

    debug('EXTERNAL_WEBSITE/sign-trx: signing transaction transfer() again)');
    trx = await externalUser.signTransaction(externalApp.accountName, 'transfer', {
        from,
        to,
        quantity: `2.000000 ${getSettings().currencySymbol}`,
        memo: 'test',
    });

    expect(trx).toBeDefined();
    expect(typeof trx.transaction_id).toBe('string');
    expect(trx.processed.receipt.status).toBe('executed');
    // TODO: check action trace for action and the does not contain link auth
}

export async function externalWebsiteClientAuth(
    externalUser: ExternalUser,
    externalApp: App,
    options: ExternalUserLoginTestOptions
) {
    debug('EXTERNAL_WEBSITE/client-auth: signing client auth');

    const data: ClientAuthorizationData = {
        foo: 'bar',
    };

    if (options.dataRequestUsername) {
        const username = await externalUser.getUsername();

        if (!username) throw new Error('Username not found');
        data.username = username.toString();
    }

    const clientAuth = await externalUser.createClientAuthorization(data);

    const verifiedAuth = await verifyClientAuthorization(clientAuth);

    expect(verifiedAuth).toBeDefined();
    expect(verifiedAuth.account).toBe((await externalUser.getAccountName()).toString());
    expect(verifiedAuth.request.jwt).toBe(clientAuth);
    expect(typeof verifiedAuth.request.id).toBe('string');
    expect(verifiedAuth.request.id.length).toBe(16);

    expect(verifiedAuth.request.origin).toBe(externalApp.origin);
    expect(verifiedAuth.did).toBe(await externalUser.getDid());
    expect(verifiedAuth.data.foo).toBe('bar');

    if (options.dataRequestUsername) {
        const username = await externalUser.getUsername();

        if (!username) throw new Error('Username not found');

        expect(verifiedAuth.username).toBe(username.toString());
        expect(verifiedAuth.data.username).toBe(username.toString());
    }
}

export async function setupLinkAuthSubscriber(user: IUserPublic): Promise<void> {
    // Setup a promise that resolves when the subscriber executes
    // This emulates the Tonomy ID app, which waits for LinkAuth requests and executes them
    return new Promise<void>((resolve, reject) => {
        user.subscribeMessage(async (message) => {
            debug('TONOMY_ID/storage: LinkAuth request received');

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
