/* eslint-disable camelcase */
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
    getSettings,
    IOnPressLoginOptions,
    verifyClientAuthorization,
    ClientAuthorizationData,
    DualWalletRequests,
    DualWalletResponse,
} from '../../src/sdk';
import { ExternalUser, LoginWithTonomyMessages } from '../../src/api/externalUser';
import { VerifiableCredential } from '../../src/sdk/util/ssi/vc';
import { getAccount, getChainId, getAccountNameFromUsername } from '../../src/sdk/services/blockchain';
import { getDidKeyIssuerFromStorage } from '../../src/sdk/helpers/didKeyStorage';
import { onRedirectLogin } from '../../src/sdk/helpers/urls';
import { ExternalUserLoginTestOptions } from '../externalUser.integration.test';
import { IUserPublic, scanQrAndAck, setupLoginRequestSubscriber } from './user';
import Debug from 'debug';
import { KYCVC, parseAntelopeDid } from '../../src/sdk/util';
import { mockVeriffApproved, mockVeriffDeclined } from '../services/veriffMock';
import { setReferrer, setUrl } from './browser';

const debug = Debug('tonomy-sdk-tests:helpers:externalUser');

type LoginTestOptions = {
    externalApp: App;
    tonomyLoginApp: App;
    EXTERNAL_WEBSITE_jsKeyManager: KeyManager;
    TONOMY_LOGIN_WEBSITE_jsKeyManager: KeyManager;
    TONOMY_ID_user: IUserPublic;
    TONOMY_LOGIN_WEBSITE_storage_factory: StorageFactory;
    EXTERNAL_WEBSITE_storage_factory: StorageFactory;
    communicationsToCleanup: Communication[];
};

export async function loginToExternalApp(
    {
        externalApp,
        tonomyLoginApp,
        EXTERNAL_WEBSITE_jsKeyManager,
        TONOMY_LOGIN_WEBSITE_jsKeyManager,
        TONOMY_ID_user,
        TONOMY_LOGIN_WEBSITE_storage_factory,
        EXTERNAL_WEBSITE_storage_factory,
        communicationsToCleanup,
    }: LoginTestOptions,
    testOptions: ExternalUserLoginTestOptions
): Promise<ExternalUser | undefined> {
    const TONOMY_ID_did = await TONOMY_ID_user.getDid();

    // #####External website user (login page) #####
    // ################################

    // create request for external website
    // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
    // Instead we take the token as output
    setUrl(externalApp.origin + '/login');

    const { did: EXTERNAL_WEBSITE_did, redirectUrl: EXTERNAL_WEBSITE_redirectUrl } =
        await externalWebsiteUserPressLoginToTonomyButton(
            EXTERNAL_WEBSITE_jsKeyManager,
            tonomyLoginApp.origin,
            testOptions
        );

    // #####Tonomy Login App website user (login page) #####
    // ########################################

    // catch the externalAppToken in the URL
    setReferrer(externalApp.origin);
    setUrl(EXTERNAL_WEBSITE_redirectUrl);

    // Setup a request for the login app
    const {
        did: TONOMY_LOGIN_WEBSITE_did,
        requests: TONOMY_LOGIN_WEBSITE_requests,
        communication: TONOMY_LOGIN_WEBSITE_communication,
    } = await loginWebsiteOnRedirect(EXTERNAL_WEBSITE_did, TONOMY_LOGIN_WEBSITE_jsKeyManager);

    communicationsToCleanup.push(TONOMY_LOGIN_WEBSITE_communication);

    // setup subscriber for connection to Tonomy ID acknowledgement
    const { subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber, promise: TONOMY_LOGIN_WEBSITE_ackMessagePromise } =
        await setupTonomyIdIdentifySubscriber(TONOMY_ID_did);

    expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(0);
    const TONOMY_LOGIN_WEBSITE_subscription = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
        TONOMY_LOGIN_WEBSITE_messageSubscriber,
        IdentifyMessage.getType()
    );

    debug(
        'TONOMY_LOGIN_WEBSITE_communication.socketServer',
        TONOMY_LOGIN_WEBSITE_communication.socketServer.listenersAny()
    );
    expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);

    // ##### Tonomy ID user (QR code scanner screen) #####
    // ##########################
    await scanQrAndAck(TONOMY_ID_user, TONOMY_LOGIN_WEBSITE_did);

    const TONOMY_ID_requestSubscriber = setupLoginRequestSubscriber(
        TONOMY_ID_user,
        TONOMY_LOGIN_WEBSITE_did,
        testOptions
    );

    // #####Tonomy Login App website user (login page) #####
    // ########################################

    // wait for the ack message to confirm Tonomy ID is connected
    const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_ackMessagePromise;

    expect(connectionMessageFromTonomyId.getSender()).toBe(TONOMY_ID_did + '#local');

    await sendLoginRequestsMessage(
        TONOMY_LOGIN_WEBSITE_requests,
        TONOMY_LOGIN_WEBSITE_jsKeyManager,
        TONOMY_LOGIN_WEBSITE_communication,
        connectionMessageFromTonomyId.getSender()
    );

    // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
    const {
        subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber2,
        promise: TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise,
    } = await setupTonomyIdRequestConfirmSubscriber(TONOMY_ID_did);

    TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription);
    const TONOMY_LOGIN_WEBSITE_subscription2 = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
        TONOMY_LOGIN_WEBSITE_messageSubscriber2,
        LoginRequestResponseMessage.getType()
    );

    expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);

    // ##### Tonomy ID user (SSO screen) #####
    // ##########################

    // Wait for the subscriber to execute
    await TONOMY_ID_requestSubscriber;

    if (testOptions.dataRequestKYC && testOptions.dataRequestKYCDecision !== 'approved') {
        debug('TONOMY_ID/SSO: KYC verification failed, login was never executed by user');
        return;
    }

    // #####Tonomy Login App website user (callback page) #####
    // ########################################
    setUrl(tonomyLoginApp.origin);

    // Receive the message back, and redirect to the callback
    const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

    expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);
    TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription2);
    expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(0);

    const walletResponse = requestConfirmedMessageFromTonomyId.getPayload();

    expect(walletResponse).toBeDefined();
    expect(walletResponse.success).toBe(true);
    expect(walletResponse.external).toBeDefined();
    expect(walletResponse.sso).toBeDefined();

    expect(walletResponse.external?.getResponses()?.length).toBe(testOptions.dataRequest ? 2 : 1);
    expect(walletResponse.sso?.getResponses()?.length).toBe(2);

    expect(walletResponse.sso?.getAccountName().toString()).toBe((await TONOMY_ID_user.getAccountName()).toString());
    const dataRequestResponse = walletResponse.sso?.getDataSharingResponse();

    if (testOptions.dataRequest) {
        expect(dataRequestResponse).toBeDefined();

        if (testOptions.dataRequestUsername) {
            expect(dataRequestResponse?.data.username?.toString()).toBe(
                (await TONOMY_ID_user.getUsername()).username.toString()
            );
        }
    }

    debug('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
    setUrl(walletResponse.getRedirectUrl(false));

    const { responses: TONOMY_LOGIN_WEBSITE_responses } = await loginWebsiteOnCallback(
        TONOMY_LOGIN_WEBSITE_jsKeyManager,
        TONOMY_LOGIN_WEBSITE_storage_factory
    );

    if (!TONOMY_LOGIN_WEBSITE_responses.external)
        throw new Error('TONOMY_LOGIN_WEBSITE_responses.external is undefined');
    const EXTERNAL_WEBSITE_response = DualWalletResponse.fromResponses(TONOMY_LOGIN_WEBSITE_responses.external);
    const EXTERNAL_WEBSITE_redirectBackUrl = EXTERNAL_WEBSITE_response.getRedirectUrl();

    // #####External website user (callback page) #####
    // ################################

    setUrl(EXTERNAL_WEBSITE_redirectBackUrl);

    const externalUser = await externalWebsiteOnCallback(
        EXTERNAL_WEBSITE_jsKeyManager,
        EXTERNAL_WEBSITE_storage_factory,
        await TONOMY_ID_user.getAccountName(),
        testOptions
    );

    communicationsToCleanup.push(getProtectedCommunication(externalUser));

    return externalUser;
}

export function getProtectedCommunication(user: ExternalUser): Communication {
    return (user as unknown as { communication: Communication }).communication;
}

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

        if (testOptions.dataRequestUsername) {
            onPressLoginOptions.dataRequest.username = testOptions.dataRequestUsername;
        }

        if (testOptions.dataRequestKYC) {
            onPressLoginOptions.dataRequest.kyc = testOptions.dataRequestKYC;
        }
    }

    const { requests } = (await ExternalUser.loginWithTonomy(
        onPressLoginOptions,
        keyManager
    )) as LoginWithTonomyMessages;

    const did = requests.external.getDid();

    expect(did).toContain('did:key:');
    debug('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');
    const redirectUrl = loginAppOrigin + '/login?payload=' + requests.toString();

    return { did, redirectUrl };
}

export async function loginWebsiteOnRedirect(
    externalWebsiteDid: string,
    keyManager: KeyManager
): Promise<{
    did: string;
    requests: DualWalletRequests;
    communication: Communication;
}> {
    debug('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

    const externalRequest = await onRedirectLogin();

    debug('TONOMY_LOGIN_WEBSITE/login: create did:key and login request');

    const { requests: tonomyLoginRequests, loginToCommunication } = (await ExternalUser.loginWithTonomy(
        {
            callbackPath: '/callback',
            redirect: false,
            dataRequest: {
                username: true,
            },
        },
        keyManager
    )) as LoginWithTonomyMessages;
    const ssoRequest = tonomyLoginRequests.external;

    if (!ssoRequest) throw new Error('SSO request not found in login requests');
    const did = ssoRequest.getDid();

    expect(did).toContain('did:key:');
    expect(did).not.toEqual(externalWebsiteDid);

    // Login to the Tonomy Communication as the login app user
    debug('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
    const communication = new Communication(false);
    const loginResponse = await communication.login(loginToCommunication);

    expect(loginResponse).toBe(true);

    const requests = new DualWalletRequests(externalRequest.external, ssoRequest);

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
    requests: DualWalletRequests,
    keyManager: KeyManager,
    communication: Communication,
    recipientDid: string
) {
    const didKeyIssuer = await getDidKeyIssuerFromStorage(keyManager);

    const loginRequestMessage = await LoginRequestsMessage.signMessage(requests, didKeyIssuer, recipientDid);

    const sendMessageResponse = await communication.sendMessage(loginRequestMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function loginWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory) {
    debug('TONOMY_LOGIN_WEBSITE/callback: fetching response from URL and verifying login');
    await ExternalUser.verifyLoginResponse({
        external: false,
        keyManager,
        storageFactory,
    });

    debug('TONOMY_LOGIN_WEBSITE/callback: checking login request of external website');
    const responses = DualWalletResponse.fromUrl();

    await responses.verify();

    debug('TONOMY_LOGIN_WEBSITE/callback: redirecting to external website');

    return { responses };
}

export async function externalWebsiteOnCallback(
    keyManager: KeyManager,
    storageFactory: StorageFactory,
    accountName: Name,
    testOptions: ExternalUserLoginTestOptions
) {
    debug('EXTERNAL_WEBSITE/callback: fetching response from URL');
    const { user, data } = await ExternalUser.verifyLoginResponse({
        keyManager,
        storageFactory,
    });

    const externalWebsiteAccount = await user.getAccountName();
    const tonomyIdAccount = accountName;

    expect(externalWebsiteAccount.toString()).toBe(tonomyIdAccount.toString());

    if (testOptions.dataRequest && testOptions.dataRequestKYC) {
        if (!testOptions.dataRequestKYCDecision) throw new Error('dataRequestKYCDecision is undefined');

        const kycVc = data?.kyc?.verifiableCredential;

        if (!kycVc) throw new Error('kycVc is undefined');
        const issuer = kycVc.getIssuer();
        const { fragment, account, chain } = parseAntelopeDid(issuer);

        expect(kycVc instanceof KYCVC).toBe(true);
        expect(account).toBe('ops.tmy');
        expect(fragment).toBe('active');
        expect(chain).toBe(await getChainId());
        expect(kycVc.getType()).toBe(KYCVC.getType());

        const kycPayload = kycVc.getPayload();
        const mockData = testOptions.dataRequestKYCDecision === 'approved' ? mockVeriffApproved : mockVeriffDeclined;

        expect(kycPayload.data.verification.decision).toBe(testOptions.dataRequestKYCDecision);
        expect(kycPayload.data.verification.person.firstName).toBeDefined();
        expect(kycPayload.data.verification.person.firstName?.value).toBe(
            mockData.data.verification.person.firstName?.value
        );

        const kycValue = data?.kyc?.value;

        if (!kycValue) throw new Error('kycValue is undefined');

        expect(kycValue.data.verification.person.firstName?.value).toBeDefined();
        expect(kycValue.data.verification.person.firstName?.value).toBe(
            mockData.data.verification.person.firstName?.value
        );
    }

    return user;
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
        data.username = username;
    }

    debug('EXTERNAL_WEBSITE/client-auth: creating client auth', options, data);
    const clientAuth = await externalUser.createClientAuthorization(data);

    const verifiedAuth = await verifyClientAuthorization(clientAuth, {
        verifyUsername: options.dataRequestUsername,
    });

    debug('EXTERNAL_WEBSITE/client-auth: verified client auth', verifiedAuth);

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
