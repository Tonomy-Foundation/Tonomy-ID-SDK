/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    App,
    User,
    KeyManager,
    StorageFactory,
    STORAGE_NAMESPACE,
    IdentifyMessage,
    LoginRequestResponseMessage,
    ExternalUser,
    DemoTokenContract,
    getSettings,
    LoginRequestResponseMessagePayload,
    LoginResponse,
    ResponsesManager,
    setSettings,
} from '../src/sdk/index';
import URL from 'jsdom-url';
import { JsKeyManager } from '../src/sdk/storage/jsKeyManager';

// helpers
import {
    IUserPublic,
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
    scanQrAndAck,
    setupLoginRequestSubscriber,
} from './helpers/user';
import { sleep } from './helpers/sleep';
import {
    externalWebsiteOnCallback,
    externalWebsiteOnReload,
    externalWebsiteUserPressLoginToTonomyButton,
    loginWebsiteOnCallback,
    loginWebsiteOnRedirect,
    sendLoginRequestsMessage,
    setupTonomyIdIdentifySubscriber,
    setupTonomyIdRequestConfirmSubscriber,
    externalWebsiteOnLogout,
    externalWebsiteSignVc,
    externalWebsiteSignTransaction,
    setupLinkAuthSubscriber,
} from './helpers/externalUser';
import { createStorageFactory } from './helpers/storageFactory';
import { objToBase64Url } from '../src/sdk/util/base64';
import { createSigner, getTonomyOperationsKey } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import deployContract from '../src/cli/bootstrap/deploy-contract';

export type ExternalUserLoginTestOptions = {
    dataRequest: boolean;
    dataRequestUsername?: boolean;
};

setTestSettings(process.env.LOG === 'true');

// @ts-expect-error - type error on global
global.URL = URL;

const signer = createSigner(getTonomyOperationsKey());

describe('Login to external website', () => {
    jest.setTimeout(30000);

    // OBJECTS HERE denote the different devices/apps the user is using
    // it shows which device is doing what action and has access to which variables
    // TONOMY_ID_
    // EXTERNAL_WEBSITE_
    // TONOMY_LOGIN_WEBSITE_

    let TONOMY_ID_user: IUserPublic;
    let TONOMY_ID_did: string;
    let externalApp: App;
    let tonomyLoginApp: App;
    let TONOMY_LOGIN_WEBSITE_jsKeyManager: KeyManager;
    let EXTERNAL_WEBSITE_jsKeyManager: KeyManager;
    let TONOMY_LOGIN_WEBSITE_storage_factory: StorageFactory;
    let EXTERNAL_WEBSITE_storage_factory: StorageFactory;
    let EXTERNAL_WEBSITE_user: ExternalUser;

    beforeEach(async () => {
        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        if (getSettings().loggerLevel === 'debug') console.log('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user);

        // Create two apps which will be logged into
        externalApp = await createRandomApp();

        if (getSettings().loggerLevel === 'debug')
            console.log('Deploying and configuring demo.tmy contract to ', externalApp.accountName.toString());
        await deployContract(
            { account: externalApp.accountName, contractDir: './Tonomy-Contracts/contracts/demo.tmy' },
            signer,
            {
                throughTonomyProxy: true,
                extraAuthorization: {
                    actor: 'tonomy',
                    permission: 'active',
                },
            }
        );
        console.log('getSettings', getSettings());
        await DemoTokenContract.atAccount(externalApp.accountName).create(
            `1000000000 ${getSettings().currencySymbol}`,
            signer
        );
        await DemoTokenContract.atAccount(externalApp.accountName).issue(
            `10000 ${getSettings().currencySymbol}`,
            signer
        );

        tonomyLoginApp = await createRandomApp();

        setSettings({
            ...settings,
            ssoWebsiteOrigin: tonomyLoginApp.origin,
        });

        // setup KeyManagers for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_jsKeyManager = new JsKeyManager();
        EXTERNAL_WEBSITE_jsKeyManager = new JsKeyManager();

        // setup storage factories for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'external-website.');
    });

    afterEach(async () => {
        await TONOMY_ID_user.logout();
        if (getSettings().loggerLevel === 'debug') console.log('finished test');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO figure out why this is needed and remove issue
        await sleep(500);
    });

    describe('SSO login full end-to-end flow with external desktop browser (using communication service)', () => {
        test('Successful login to external website', async () => {
            await runExternalUserLoginTest({ dataRequest: false });
        });

        test('Successful login to external website with empty data request', async () => {
            await runExternalUserLoginTest({ dataRequest: true });
        });

        test('Successful login to external website with data request for username', async () => {
            await runExternalUserLoginTest({ dataRequest: true, dataRequestUsername: true });
        });
    });

    async function runExternalUserLoginTest(testOptions: ExternalUserLoginTestOptions) {
        let expectedTests = 45;

        if (testOptions.dataRequest) {
            expectedTests += 1;
            if (testOptions.dataRequestUsername) expectedTests += 1;
        }

        expect.assertions(expectedTests);

        // #####External website user (login page) #####
        // ################################

        // create request for external website
        // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
        // Instead we take the token as output

        // @ts-expect-error - cannot find name jsdom
        jsdom.reconfigure({
            url: externalApp.origin + '/login',
        });

        const { did: EXTERNAL_WEBSITE_did, redirectUrl: EXTERNAL_WEBSITE_redirectUrl } =
            await externalWebsiteUserPressLoginToTonomyButton(
                EXTERNAL_WEBSITE_jsKeyManager,
                tonomyLoginApp.origin,
                testOptions
            );

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // catch the externalAppToken in the URL
        jest.spyOn(document, 'referrer', 'get').mockReturnValue(externalApp.origin);
        // @ts-expect-error - cannot find name jsdom
        jsdom.reconfigure({
            url: EXTERNAL_WEBSITE_redirectUrl,
        });

        // Setup a request for the login app
        const {
            did: TONOMY_LOGIN_WEBSITE_did,
            requests: TONOMY_LOGIN_WEBSITE_requests,
            communication: TONOMY_LOGIN_WEBSITE_communication,
        } = await loginWebsiteOnRedirect(EXTERNAL_WEBSITE_did, TONOMY_LOGIN_WEBSITE_jsKeyManager);

        // setup subscriber for connection to Tonomy ID acknowledgement
        const { subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber, promise: TONOMY_LOGIN_WEBSITE_ackMessagePromise } =
            await setupTonomyIdIdentifySubscriber(TONOMY_ID_did);

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);
        const TONOMY_LOGIN_WEBSITE_subscription = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
            TONOMY_LOGIN_WEBSITE_messageSubscriber,
            IdentifyMessage.getType()
        );

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

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

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

        // ##### Tonomy ID user (SSO screen) #####
        // ##########################

        // Wait for the subscriber to execute
        await TONOMY_ID_requestSubscriber;

        // #####Tonomy Login App website user (callback page) #####
        // ########################################
        // @ts-expect-error - cannot find name jsdom
        jsdom.reconfigure({
            url: tonomyLoginApp.origin,
        });

        // Receive the message back, and redirect to the callback
        const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription2);
        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);

        const payload = requestConfirmedMessageFromTonomyId.getPayload();

        expect(payload).toBeDefined();
        expect(payload.success).toBe(true);
        expect(payload.response).toBeDefined();

        expect(payload.response?.length).toBe(testOptions.dataRequest ? 4 : 3);

        if (!payload.response) throw new Error('payload.response is undefined');

        const managedResponses = new ResponsesManager(payload.response);

        await managedResponses.fetchMeta({ accountName: await TONOMY_ID_user.getAccountName() });
        const loginResponse = managedResponses.getLoginResponsesWithSameOriginOrThrow();

        expect(loginResponse.getResponse().getPayload().accountName?.toString()).toBe(
            (await TONOMY_ID_user.getAccountName()).toString()
        );

        const dataRequestResponse = managedResponses.getDataSharingResponseWithSameOrigin();

        if (testOptions.dataRequest) {
            expect(dataRequestResponse).toBeDefined();

            if (testOptions.dataRequestUsername) {
                expect(dataRequestResponse?.getResponse().getPayload().data?.username?.toString()).toBe(
                    (await TONOMY_ID_user.getUsername()).username.toString()
                );
            }
        }

        if (getSettings().loggerLevel === 'debug') console.log('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
        const TONOMY_LOGIN_WEBSITE_base64UrlPayload = objToBase64Url(payload);

        // @ts-expect-error - cannot find name jsdom
        jsdom.reconfigure({
            url: tonomyLoginApp.origin + `/callback?payload=${TONOMY_LOGIN_WEBSITE_base64UrlPayload}`,
        });

        const { externalLoginRequest, managedResponses: TONOMY_LOGIN_WEBSITE_managedResponses } =
            await loginWebsiteOnCallback(
                TONOMY_LOGIN_WEBSITE_jsKeyManager,
                TONOMY_LOGIN_WEBSITE_storage_factory,
                testOptions
            );

        const EXTERNAL_WEBSITE_loginRequestResponseMessagePayload: LoginRequestResponseMessagePayload = {
            success: true,
            response: TONOMY_LOGIN_WEBSITE_managedResponses.getResponsesWithDifferentOriginOrThrow().map((response) =>
                response.getRequestAndResponse()
            ),
        };

        const EXTERNAL_WEBSITE_base64UrlPayload = objToBase64Url(EXTERNAL_WEBSITE_loginRequestResponseMessagePayload);

        // #####External website user (callback page) #####
        // ################################
        // @ts-expect-error - cannot find name jsdom
        jsdom.reconfigure({
            url:
                externalLoginRequest.getPayload().origin +
                externalLoginRequest.getPayload().callbackPath +
                `?payload=${EXTERNAL_WEBSITE_base64UrlPayload}`,
        });

        EXTERNAL_WEBSITE_user = await externalWebsiteOnCallback(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            await TONOMY_ID_user.getAccountName()
        );

        await EXTERNAL_WEBSITE_user.communication.disconnect();

        EXTERNAL_WEBSITE_user = await externalWebsiteOnReload(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            TONOMY_ID_user
        );

        await externalWebsiteSignVc(EXTERNAL_WEBSITE_user);

        // ##### Tonomy ID user (storage container) #####
        // ##########################

        const TONOMY_ID_linkAuthSubscriber = setupLinkAuthSubscriber(TONOMY_ID_user);

        // #####External website user (callback page) #####
        // ################################
        await externalWebsiteSignTransaction(EXTERNAL_WEBSITE_user, externalApp);
        await TONOMY_ID_linkAuthSubscriber;

        await externalWebsiteOnLogout(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);

        // cleanup connections
        await TONOMY_LOGIN_WEBSITE_communication.disconnect();
        await EXTERNAL_WEBSITE_user.communication.disconnect();
    }
});
