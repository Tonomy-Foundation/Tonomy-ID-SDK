/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */

// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import {
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
    scanQrAndAck,
    setupLoginRequestSubscriber,
} from './util/user';
import { App, setSettings, User, KeyManager, StorageFactory } from '../src/index';
import settings from './services/settings';
import URL from 'jsdom-url';
import { JsKeyManager } from '../test/services/jskeymanager';
import { sleep } from './util/sleep';
import {
    externalWebsiteOnCallback,
    externalWebsiteOnReload,
    externalWebsiteUserPressLoginToTonomyButton,
    loginWebsiteOnCallback,
    loginWebsiteOnRedirect,
    sendLoginRequestsMessage,
    setupTonomyIdAckSubscriber,
    setupTonomyIdRequestConfirmSubscriber,
} from './util/externalUser';
import { createStorageFactory } from './util/storageFactory';

// @ts-expect-error - type error on global
global.URL = URL;

setSettings(settings);

const log = true;

describe('External User class', () => {
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
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory('tonomy-login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory('external-website.');
    });

    afterEach(async () => {
        await TONOMY_ID_user.logout();
        if (log) console.log('finished test');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO figure out why this is needed and remove issue
        await sleep(500);
    });

    describe('SSO login full end-to-end flow', () => {
        test('User succeeds at login to external website', async () => {
            expect.assertions(34);

            const appsFound = [false, false];

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
            } = await setupTonomyIdAckSubscriber(TONOMY_ID_did, log);

            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);
            TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber);
            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

            // ##### Tonomy ID user (QR code scanner screen) #####
            // ##########################
            await scanQrAndAck(TONOMY_ID_user, TONOMY_LOGIN_WEBSITE_did, log);

            // #####Tonomy Login App website user (login page) #####
            // ########################################
            const TONOMY_ID_requestSubscriber = setupLoginRequestSubscriber(
                TONOMY_ID_user,
                externalApp.origin,
                EXTERNAL_WEBSITE_did,
                tonomyLoginApp.origin,
                TONOMY_LOGIN_WEBSITE_did,
                appsFound,
                log
            );

            // wait for the ack message to confirm Tonomy ID is connected
            const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_ackMessagePromise;

            expect(connectionMessageFromTonomyId.type).toBe('ack');
            expect(connectionMessageFromTonomyId.message.getSender()).toBe(TONOMY_ID_did + '#local');

            await sendLoginRequestsMessage(
                TONOMY_LOGIN_WEBSITE_jwtRequests,
                TONOMY_LOGIN_WEBSITE_jsKeyManager,
                TONOMY_LOGIN_WEBSITE_communication,
                connectionMessageFromTonomyId.message.getSender(),
                log
            );

            // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
            const {
                subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber2,
                promise: TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise,
            } = await setupTonomyIdRequestConfirmSubscriber(TONOMY_ID_did, log);

            TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber);
            TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber2);
            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

            // ##### Tonomy ID user (SSO screen) #####
            // ##########################

            // Wait for the subscriber to execute
            await TONOMY_ID_requestSubscriber;

            // check both apps were logged into
            expect(appsFound[0] && appsFound[1]).toBe(true);

            // #####Tonomy Login App website user (callback page) #####
            // ########################################

            // Receive the message back, and redirect to the callback
            const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);
            TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber2);
            expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);

            const payload = requestConfirmedMessageFromTonomyId.message.getPayload();
            const TONOMY_LOGIN_WEBSITE_requests = JSON.parse(payload.requests) as string[];

            expect(requestConfirmedMessageFromTonomyId.type).toBe('request');
            expect(payload).toBeDefined();
            expect(payload.requests).toBeDefined();
            expect(payload.accountName).toBeDefined();

            expect(TONOMY_LOGIN_WEBSITE_requests.length).toBe(2);
            expect(payload.accountName).toBe(await (await TONOMY_ID_user.getAccountName()).toString());
            // TODO uncomment when we have username
            // expect(payload.username).toBe((await TONOMY_ID_user.getUsername()).username);

            if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
            // @ts-expect-error - cannot find name jsdom
            jsdom.reconfigure({
                url:
                    tonomyLoginApp.origin +
                    `/callback?requests=${payload.requests}&accountName=${payload.accountName}&username=nousername`,
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

            // @ts-expect-error - cannot find name jsdom
            jsdom.reconfigure({
                url:
                    redirectJwtPayload.origin +
                    redirectJwtPayload.callbackPath +
                    `?username=${TONOMY_LOGIN_WEBSITE_username}&accountName=${TONOMY_LOGIN_WEBSITE_accountName.toString()}&requests=` +
                    JSON.stringify([TONOMY_LOGIN_WEBSITE_redirectJwt?.jwt]),
            });

            // #####External website user (callback page) #####
            // ################################

            await externalWebsiteOnCallback(
                EXTERNAL_WEBSITE_jsKeyManager,
                EXTERNAL_WEBSITE_storage_factory,
                await TONOMY_ID_user.getAccountName(),
                log
            );

            await externalWebsiteOnReload(
                EXTERNAL_WEBSITE_jsKeyManager,
                EXTERNAL_WEBSITE_storage_factory,
                TONOMY_ID_user,
                log
            );

            // cleanup connections
            await TONOMY_LOGIN_WEBSITE_communication.disconnect();
        });
    });
});
