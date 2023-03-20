/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */

// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import { setSettings, Message, UserApps, Communication, App, KeyManagerLevel, Subscriber } from '../src/index';
import { JWTLoginPayload } from '../src/userApps';
import settings from './services/settings';
import URL from 'jsdom-url';
import { ExternalUser } from '../src/externalUser';
import { JsKeyManager } from '../test/services/jskeymanager';
import { PublicKey } from '@greymass/eosio';
import { sleep } from './util/sleep';
import { jsStorageFactory } from '../test/services/jsstorage';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.URL = URL;
setSettings(settings);

const log = false;

describe('External User class', () => {
    jest.setTimeout(30000);

    test('full login to external app success flow', async () => {
        expect.assertions(34);

        // OBJECTS HERE denote the different devices/apps the user is using
        // it shows which device is doing what action and has access to which variables
        // TONOMY_ID_
        // EXTERNAL_WEBSITE_
        // TONOMY_LOGIN_WEBSITE_

        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        if (log) console.log('TONOMY_ID: creating new Tonomy ID user');
        const TONOMY_ID_user = (await createRandomID()).user;
        const TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        // Login to Tonomy Communication as the user
        const TONOMY_ID_loginMessage = await TONOMY_ID_user.signMessage({});

        if (log) console.log('TONOMY_ID/appStart: connect to Tonomy Communication');

        const TONOMY_ID_loginResponse = await TONOMY_ID_user.communication.login(TONOMY_ID_loginMessage);

        expect(TONOMY_ID_loginResponse).toBe(true);

        // Create two apps which will be logged into
        const externalApp = await createRandomApp();
        const tonomyLoginApp = await createRandomApp();
        const appsFound = [false, false];

        // #####External website user (login page) #####
        // ################################

        // create request for external website
        // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
        // Instead we take the token as output
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url: externalApp.origin + '/login',
        });
        const EXTERNAL_WEBSITE_jsKeyManager = new JsKeyManager();

        if (log) console.log('EXTERNAL_WEBSITE/login: create did:jwk and login request');

        const EXTERNAL_WEBSITE_loginRequestJwt = (await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            EXTERNAL_WEBSITE_jsKeyManager
        )) as string;

        expect(typeof EXTERNAL_WEBSITE_loginRequestJwt).toBe('string');

        const EXTERNAL_WEBSITE_did = new Message(EXTERNAL_WEBSITE_loginRequestJwt).getSender();

        expect(EXTERNAL_WEBSITE_did).toContain('did:jwk:');

        if (log) console.log('EXTERNAL_WEBSITE/login: redirect to Tonomy Login Website');

        const EXTERNAL_WEBSITE_redirectUrl =
            tonomyLoginApp.origin + '/login?requests=' + JSON.stringify([EXTERNAL_WEBSITE_loginRequestJwt]);

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // catch the externalAppToken in the URL
        jest.spyOn(document, 'referrer', 'get').mockReturnValue(externalApp.origin);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url: EXTERNAL_WEBSITE_redirectUrl,
        });

        if (log) console.log('TONOMY_LOGIN_WEBSITE/login: collect external website token from URL');

        const TONOMY_LOGIN_WEBSITE_externalWebsiteJwtVerified = await UserApps.onRedirectLogin();

        expect(TONOMY_LOGIN_WEBSITE_externalWebsiteJwtVerified).toBeInstanceOf(Message);
        expect(TONOMY_LOGIN_WEBSITE_externalWebsiteJwtVerified.getSender()).toBe(EXTERNAL_WEBSITE_did);

        // Setup a request for the login app
        const TONOMY_LOGIN_WEBSITE_jsKeyManager = new JsKeyManager();

        if (log) console.log('TONOMY_LOGIN_WEBSITE/login: create did:jwk and login request');
        const TONOMY_LOGIN_WEBSITE_loginRequestJwt = (await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            TONOMY_LOGIN_WEBSITE_jsKeyManager
        )) as string;
        const TONOMY_LOGIN_WEBSITE_did = new Message(TONOMY_LOGIN_WEBSITE_loginRequestJwt).getSender();

        expect(TONOMY_LOGIN_WEBSITE_did).toContain('did:jwk:');
        expect(TONOMY_LOGIN_WEBSITE_did).not.toEqual(EXTERNAL_WEBSITE_did);

        const TONOMY_LOGIN_WEBSITE_jwtRequests = [
            EXTERNAL_WEBSITE_loginRequestJwt,
            TONOMY_LOGIN_WEBSITE_loginRequestJwt,
        ];

        // Create a new login message, and take the DID (did:jwk) out as their identity
        // Tonomy ID will scan the DID in barcode and use connect
        const TONOMY_LOGIN_WEBSITE_logInMessage = new Message(TONOMY_LOGIN_WEBSITE_loginRequestJwt);

        expect(TONOMY_LOGIN_WEBSITE_logInMessage).toBeInstanceOf(Message);

        // Login to the Tonomy Communication as the login app user
        if (log) console.log('TONOMY_LOGIN_WEBSITE/login: connect to Tonomy Communication');
        const TONOMY_LOGIN_WEBSITE_communication = new Communication();
        const TONOMY_LOGIN_WEBSITE_loginResponse = await TONOMY_LOGIN_WEBSITE_communication.login(
            TONOMY_LOGIN_WEBSITE_logInMessage
        );

        expect(TONOMY_LOGIN_WEBSITE_loginResponse).toBe(true);

        // setup subscriber for connection to Tonomy ID acknowledgement
        let TONOMY_LOGIN_WEBSITE_messageSubscriber: Subscriber;
        const TONOMY_LOGIN_WEBSITE_subscriberExecutor = (resolve: any) => {
            TONOMY_LOGIN_WEBSITE_messageSubscriber = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID_did);

                if (receivedMessage.getPayload().type === 'ack') {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE/login: receive connection acknowledgement from Tonomy ID');
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

        const TONOMY_LOGIN_WEBSITE_ackMessagePromise = new Promise<{
            type: string;
            message: Message;
        }>(TONOMY_LOGIN_WEBSITE_subscriberExecutor);

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);
        // @ts-ignore TONOMY_LOGIN_WEBSITE_messageSubscriber is used before being assigned
        TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber);
        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

        // ##### Tonomy ID user (QR code scanner screen) #####
        // ##########################
        if (log) console.log('TONOMY_ID/scanQR: Scanning QR code with Tonomy ID app');

        // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
        const TONOMY_ID_barcodeScanResults = {
            data: TONOMY_LOGIN_WEBSITE_did,
        };
        const TONOMY_ID_connectMessage = await TONOMY_ID_user.signMessage(
            { type: 'ack' },
            TONOMY_ID_barcodeScanResults.data
        );

        if (log)
            console.log("TONOMY_ID/scanQr: connecting to Tonomy Login Website's with their did:jwk from the QR code");
        const TONOMY_ID_sendMessageResponse = await TONOMY_ID_user.communication.sendMessage(TONOMY_ID_connectMessage);

        expect(TONOMY_ID_sendMessageResponse).toBe(true);

        // Setup a promise that resolves when the subscriber executes
        // This emulates the Tonomy ID app, which waits for the user requests
        const TONOMY_ID_requestSubscriber = new Promise((resolve) => {
            TONOMY_ID_user.communication.subscribeMessage(async (m: any) => {
                if (log) console.log('TONOMY_ID/SSO: receive login requests from Tonomy Login Website');

                const message = new Message(m);

                // receive and verify the requests
                const requests = message.getPayload().requests;

                // TODO check this throws an error if requests are not valid, or not signed correctly
                if (log) console.log('TONOMY_ID/SSO: verifying login request');
                const verifiedRequests = await UserApps.verifyRequests(requests);

                expect(verifiedRequests.length).toBe(2);

                let tonomyIdLoginDid = '';

                for (const jwt of verifiedRequests) {
                    // parse the requests for their app data
                    const payload = jwt.getPayload() as JWTLoginPayload;
                    const loginApp = await App.getApp(payload.origin);
                    const senderDid = jwt.getSender();

                    if (loginApp.origin === externalApp.origin) {
                        appsFound[1] = true;
                        expect(senderDid).toBe(EXTERNAL_WEBSITE_did);

                        if (log)
                            console.log('TONOMY_ID/SSO: logging into external website by adding key to blockchain');
                        await TONOMY_ID_user.apps.loginWithApp(loginApp, PublicKey.from(payload.publicKey));
                    } else if (loginApp.origin === tonomyLoginApp.origin) {
                        appsFound[0] = true;
                        expect(senderDid).toBe(TONOMY_LOGIN_WEBSITE_did);
                        tonomyIdLoginDid = senderDid;
                        if (log)
                            console.log('TONOMY_ID/SSO: logging into Tonomy Login website by adding key to blockchain');
                        await TONOMY_ID_user.apps.loginWithApp(loginApp, PublicKey.from(payload.publicKey));
                    } else {
                        throw new Error('Unknown app');
                    }
                }

                const accountName = await TONOMY_ID_user.storage.accountName.toString();

                // send a message back to the app
                const respondMessage = (await TONOMY_ID_user.signMessage(
                    { requests, accountName },
                    tonomyIdLoginDid
                )) as Message;

                if (log)
                    console.log('TONOMY_ID/SSO: sending a confirmation of the logins back to Tonomy Login Website');
                const sendMessageResponse = await TONOMY_ID_user.communication.sendMessage(respondMessage);

                expect(sendMessageResponse).toBe(true);

                resolve(true);
            });
        });

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // wait for the ack message to confirm Tonomy ID is connected
        const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_ackMessagePromise;

        expect(connectionMessageFromTonomyId.type).toBe('ack');
        expect(connectionMessageFromTonomyId.message.getSender()).toBe(TONOMY_ID_did + '#local');

        // then send a Message with the two signed requests, this will be received by the Tonomy ID app
        const TONOMY_LOGIN_WEBSITE_requestMessage = await ExternalUser.signMessage(
            {
                requests: JSON.stringify(TONOMY_LOGIN_WEBSITE_jwtRequests),
            },
            TONOMY_LOGIN_WEBSITE_jsKeyManager,
            KeyManagerLevel.BROWSER_LOCAL_STORAGE,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            connectionMessageFromTonomyId.message.getSender()
        );

        if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending login request to Tonomy ID app');
        const TONOMY_LOGIN_WEBSITE_sendMessageResponse = await TONOMY_LOGIN_WEBSITE_communication.sendMessage(
            TONOMY_LOGIN_WEBSITE_requestMessage
        );

        expect(TONOMY_LOGIN_WEBSITE_sendMessageResponse).toBe(true);

        // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
        let TONOMY_LOGIN_WEBSITE_messageSubscriber2: Subscriber;
        let TONOMY_LOGIN_WEBSITE_messageSubscriber3: Subscriber;

        const TONOMY_LOGIN_WEBSITE_subscriberExecutor2 = (resolve: any) => {
            TONOMY_LOGIN_WEBSITE_messageSubscriber2 = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID_did);

                if (receivedMessage.getPayload().type === 'ack') {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive connection acknowledgement from Tonomy ID');
                    // we receive the ack message after Tonomy ID scans our QR code
                    resolve({ message: receivedMessage, type: 'ack' });
                } else {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive receipt of login request from Tonomy ID');
                    // we receive a message after Tonomy ID user confirms consent to the login request
                    resolve({ message: receivedMessage, type: 'request' });
                    // reject();
                }
            };

            TONOMY_LOGIN_WEBSITE_messageSubscriber3 = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID_did);

                if (receivedMessage.getPayload().type === 'ack') {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive connection acknowledgement from Tonomy ID');
                    // we receive the ack message after Tonomy ID scans our QR code
                    resolve({ message: receivedMessage, type: 'ack' });
                } else {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive receipt of login request from Tonomy ID');
                    // we receive a message after Tonomy ID user confirms consent to the login request
                    resolve({ message: receivedMessage, type: 'request' });
                    // reject();
                }
            };
        };

        const TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise = new Promise<{
            message: Message;
            type: 'ack' | 'request';
        }>(TONOMY_LOGIN_WEBSITE_subscriberExecutor2);

        const TONOMY_LOGIN_WEBSITE_subscriberExecutor3 = (resolve: any) => {
            TONOMY_LOGIN_WEBSITE_messageSubscriber3 = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID_did);

                if (receivedMessage.getPayload().type === 'ack') {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive connection acknowledgement from Tonomy ID');
                    // we receive the ack message after Tonomy ID scans our QR code
                    resolve({ message: receivedMessage, type: 'ack' });
                } else {
                    if (log)
                        console.log('TONOMY_LOGIN_WEBSITE2/login: receive receipt of login request from Tonomy ID');
                    // we receive a message after Tonomy ID user confirms consent to the login request
                    resolve({ message: receivedMessage, type: 'request' });
                    // reject();
                }
            };
        };

        const TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise = new Promise<{
            message: Message;
            type: 'ack' | 'request';
        }>(TONOMY_LOGIN_WEBSITE_subscriberExecutor3);

        // @ts-ignore TONOMY_LOGIN_WEBSITE_messageSubscriber is used before being assigned
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber);
        // @ts-ignore TONOMY_LOGIN_WEBSITE_messageSubscriber2 is used before being assigned
        TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber2);
        TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber3, 'TonomyMessage');

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
        // @ts-ignore TONOMY_LOGIN_WEBSITE_messageSubscriber2 is used before being assigned
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber2);
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_messageSubscriber3);

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);

        expect(requestConfirmedMessageFromTonomyId.type).toBe('request');
        const payload = requestConfirmedMessageFromTonomyId.message.getPayload();

        expect(payload).toBeDefined();
        expect(payload.requests).toBeDefined();
        expect(payload.accountName).toBeDefined();
        const TONOMY_LOGIN_WEBSITE_requests = JSON.parse(payload.requests) as string[];

        expect(TONOMY_LOGIN_WEBSITE_requests.length).toBe(2);

        expect(payload.accountName).toBe(await (await TONOMY_ID_user.getAccountName()).toString());
        // TODO uncomment when we have username
        // expect(payload.username).toBe((await TONOMY_ID_user.getUsername()).username);

        if (log) console.log('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url:
                tonomyLoginApp.origin +
                `/callback?requests=${payload.requests}&accountName=${payload.accountName}&username=nousername`,
        });

        if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: fetching response from URL and verifying login');
        const TONOMY_LOGIN_WEBSITE_externalUser = await ExternalUser.verifyLoginRequest({
            keyManager: TONOMY_LOGIN_WEBSITE_jsKeyManager,
            storageFactory: jsStorageFactory,
        });

        if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: checking login request of external website');
        const { requests } = await UserApps.getLoginRequestParams();
        const result = await UserApps.verifyRequests(requests);

        const TONOMY_LOGIN_WEBSITE_redirectJwt = result.find(
            (jwtVerified) => jwtVerified.getPayload().origin !== location.origin
        );

        expect(TONOMY_LOGIN_WEBSITE_redirectJwt).toBeDefined();

        if (log) console.log('TONOMY_LOGIN_WEBSITE/callback: redirecting to external website');
        const redirectJwtPayload = TONOMY_LOGIN_WEBSITE_redirectJwt?.getPayload();

        const TONOMY_LOGIN_WEBSITE_username = (await TONOMY_LOGIN_WEBSITE_externalUser.getUsername()).username;
        const TONOMY_LOGIN_WEBSITE_accountName = await TONOMY_LOGIN_WEBSITE_externalUser.getAccountName();

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url:
                redirectJwtPayload.origin +
                redirectJwtPayload.callbackPath +
                `?username=${TONOMY_LOGIN_WEBSITE_username}&accountName=${TONOMY_LOGIN_WEBSITE_accountName.toString()}&requests=` +
                JSON.stringify([TONOMY_LOGIN_WEBSITE_redirectJwt?.jwt]),
        });

        // #####External website user (callback page) #####
        // ################################

        if (log) console.log('EXTERNAL_WEBSITE/callback: fetching response from URL');
        const EXTERNAL_WEBSITE_externalUser = await ExternalUser.verifyLoginRequest({
            keyManager: EXTERNAL_WEBSITE_jsKeyManager,
            storageFactory: jsStorageFactory,
        });

        const externalWebsiteAccount = await EXTERNAL_WEBSITE_externalUser.getAccountName();
        const tonomyIdAccount = await TONOMY_ID_user.getAccountName();

        expect(externalWebsiteAccount.toString()).toBe(tonomyIdAccount.toString());

        // cleanup connections
        await TONOMY_LOGIN_WEBSITE_communication.disconnect();
        await TONOMY_ID_user.logout();
        if (log) console.log('finished test');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO figure out why this is needed and remove issue
        await sleep(500);
    });
});
