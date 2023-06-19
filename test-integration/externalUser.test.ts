/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */

// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import {
    App,
    setSettings,
    User,
    KeyManager,
    StorageFactory,
    STORAGE_NAMESPACE,
    IdentifyMessage,
    LoginRequestResponseMessage,
    ExternalUser,
} from '../src/sdk/index';
import URL from 'jsdom-url';
import { JsKeyManager } from '../src/sdk/storage/jsKeyManager';

// helpers
import {
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
    scanQrAndAck,
    setupLoginRequestSubscriber,
} from './helpers/user';
import settings from './helpers/settings';
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

// @ts-expect-error - type error on global
global.URL = URL;

setSettings(settings);

const log = process.env.LOG === 'true';

describe('Login to external website', () => {
    jest.setTimeout(30000);

    // OBJECTS HERE denote the different devices/apps the user is using
    // it shows which device is doing what action and has access to which variables
    // TONOMY_ID_
    // EXTERNAL_WEBSITE_
    // TONOMY_LOGIN_WEBSITE_

    let TONOMY_ID_user: User;
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
        if (log) console.log('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user, log);

        // Create two apps which will be logged into
        externalApp = await createRandomApp();
        tonomyLoginApp = await createRandomApp();

        // setup KeyManagers for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_jsKeyManager = new JsKeyManager();
        EXTERNAL_WEBSITE_jsKeyManager = new JsKeyManager();

        // setup storage factories for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'external-website.');
    });

    afterEach(async () => {
        await TONOMY_ID_user.logout();
        if (log) console.log('finished test');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO figure out why this is needed and remove issue
        await sleep(500);
    });

    describe('SSO login full end-to-end flow with external desktop browser (using communication service)', () => {
        test('User succeeds at login to external website', async () => {
            expect.assertions(45);

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
                    log
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
                jwtRequests: TONOMY_LOGIN_WEBSITE_jwtRequests,
                communication: TONOMY_LOGIN_WEBSITE_communication,
            } = await loginWebsiteOnRedirect(EXTERNAL_WEBSITE_did, TONOMY_LOGIN_WEBSITE_jsKeyManager, log);

            // setup subscriber for connection to Tonomy ID acknowledgement
            const {
                subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber,
                promise: TONOMY_LOGIN_WEBSITE_ackMessagePromise,
            } = await setupTonomyIdIdentifySubscriber(TONOMY_ID_did, log);

            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);
            const TONOMY_LOGIN_WEBSITE_subscription = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
                TONOMY_LOGIN_WEBSITE_messageSubscriber,
                IdentifyMessage.getType()
            );

            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

            // ##### Tonomy ID user (QR code scanner screen) #####
            // ##########################
            await scanQrAndAck(TONOMY_ID_user, TONOMY_LOGIN_WEBSITE_did, log);

            const TONOMY_ID_requestSubscriber = setupLoginRequestSubscriber(
                TONOMY_ID_user,
                tonomyLoginApp.origin,
                TONOMY_LOGIN_WEBSITE_did,
                log
            );

            // #####Tonomy Login App website user (login page) #####
            // ########################################

            // wait for the ack message to confirm Tonomy ID is connected
            const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_ackMessagePromise;

            expect(connectionMessageFromTonomyId.getSender()).toBe(TONOMY_ID_did + '#local');

            await sendLoginRequestsMessage(
                TONOMY_LOGIN_WEBSITE_jwtRequests,
                TONOMY_LOGIN_WEBSITE_jsKeyManager,
                TONOMY_LOGIN_WEBSITE_communication,
                connectionMessageFromTonomyId.getSender(),
                log
            );

            // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
            const {
                subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber2,
                promise: TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise,
            } = await setupTonomyIdRequestConfirmSubscriber(TONOMY_ID_did, log);

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

            // Receive the message back, and redirect to the callback
            const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);
            TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription2);
            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);

            const payload = requestConfirmedMessageFromTonomyId.getPayload();

            expect(payload).toBeDefined();
            expect(payload.success).toBe(true);
            expect(payload.requests).toBeDefined();
            expect(payload.accountName).toBeDefined();

            expect(payload.requests?.length).toBe(2);
            expect(payload.accountName?.toString()).toBe(await (await TONOMY_ID_user.getAccountName()).toString());
            expect(payload.username?.toString()).toBe((await TONOMY_ID_user.getUsername()).username);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
            const TONOMY_LOGIN_WEBSITE_base64UrlPayload = objToBase64Url(payload);

            // @ts-expect-error - cannot find name jsdom
            jsdom.reconfigure({
                url: tonomyLoginApp.origin + `/callback?payload=${TONOMY_LOGIN_WEBSITE_base64UrlPayload}`,
            });

            const {
                redirectJwt: TONOMY_LOGIN_WEBSITE_redirectJwt,
                username: TONOMY_LOGIN_WEBSITE_username,
                accountName: TONOMY_LOGIN_WEBSITE_accountName,
            } = await loginWebsiteOnCallback(
                TONOMY_LOGIN_WEBSITE_jsKeyManager,
                TONOMY_LOGIN_WEBSITE_storage_factory,
                log
            );

            const redirectJwtPayload = TONOMY_LOGIN_WEBSITE_redirectJwt?.getPayload();

            const EXTERNAL_WEBSITE_base64UrlPayload = objToBase64Url({
                success: true,
                requests: [TONOMY_LOGIN_WEBSITE_redirectJwt],
                username: TONOMY_LOGIN_WEBSITE_username,
                accountName: TONOMY_LOGIN_WEBSITE_accountName,
            });

            // @ts-expect-error - cannot find name jsdom
            jsdom.reconfigure({
                url:
                    redirectJwtPayload.origin +
                    redirectJwtPayload.callbackPath +
                    `?payload=${EXTERNAL_WEBSITE_base64UrlPayload}`,
            });

            // #####External website user (callback page) #####
            // ################################

            EXTERNAL_WEBSITE_user = await externalWebsiteOnCallback(
                EXTERNAL_WEBSITE_jsKeyManager,
                EXTERNAL_WEBSITE_storage_factory,
                await TONOMY_ID_user.getAccountName(),
                log
            );

            EXTERNAL_WEBSITE_user = await externalWebsiteOnReload(
                EXTERNAL_WEBSITE_jsKeyManager,
                EXTERNAL_WEBSITE_storage_factory,
                TONOMY_ID_user,
                log
            );

            await externalWebsiteSignVc(EXTERNAL_WEBSITE_user, log);

            // ##### Tonomy ID user (storage container) #####
            // ##########################

            const TONOMY_ID_linkAuthSubscriber = setupLinkAuthSubscriber(TONOMY_ID_user, log);

            // #####External website user (callback page) #####
            // ################################

            await externalWebsiteSignTransaction(EXTERNAL_WEBSITE_user, log);
            await TONOMY_ID_linkAuthSubscriber;

            await externalWebsiteOnLogout(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);

            // cleanup connections
            await TONOMY_LOGIN_WEBSITE_communication.disconnect();
        });
    });
});
