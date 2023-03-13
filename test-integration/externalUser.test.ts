/* eslint-disable @typescript-eslint/no-unused-vars */

// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import { setSettings, Message, UserApps, Communication, App, KeyManagerLevel } from '../src/index';
import { JWTLoginPayload } from '../src/userApps';
import settings from './services/settings';
import URL from 'jsdom-url';
import { ExternalUser } from '../src/externalUser';
import { JsKeyManager } from '../test/services/jskeymanager';
import { PublicKey } from '@greymass/eosio';
import { sleep } from './util/sleep';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.URL = URL;
setSettings(settings);

describe('External User class', () => {
    jest.setTimeout(30000);

    test('full login to external app success flow', async () => {
        // expect.assertions(1);

        // OBJECTS HERE denote the different devices/apps the user is using
        // it shows which device is doing what action and has access to which variables
        const TONOMY_ID = {} as any;
        const EXTERNAL_WEBSITE = {} as any;
        const TONOMY_LOGIN_WEBSITE = {} as any;

        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        console.log('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID.user = (await createRandomID()).user;
        TONOMY_ID.did = await TONOMY_ID.user.getDid();
        expect(TONOMY_ID.did).toContain('did:antelope:');

        // Login to Tonomy Communication as the user
        TONOMY_ID.loginMessage = await TONOMY_ID.user.signMessage({});

        console.log('TONOMY_ID: connect to Tonomy Communication');

        TONOMY_ID.loginResponse = await TONOMY_ID.user.communication.login(TONOMY_ID.loginMessage);

        expect(TONOMY_ID.loginResponse).toBe(true);

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
        EXTERNAL_WEBSITE.jsKeyManager = new JsKeyManager();
        console.log('EXTERNAL_WEBSITE: create did:jwk and login request');

        EXTERNAL_WEBSITE.loginRequestJwt = await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            EXTERNAL_WEBSITE.jsKeyManager
        );
        expect(typeof EXTERNAL_WEBSITE.loginRequestJwt).toBe('string');

        EXTERNAL_WEBSITE.did = new Message(EXTERNAL_WEBSITE.loginRequestJwt).getSender();
        expect(EXTERNAL_WEBSITE.did).toContain('did:jwk:');

        console.log('EXTERNAL_WEBSITE: redirect to Tonomy Login Website');

        EXTERNAL_WEBSITE.redirectUrl =
            tonomyLoginApp.origin + '/login?requests=' + JSON.stringify([EXTERNAL_WEBSITE.loginRequestJwt]);

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // catch the externalAppToken in the URL
        jest.spyOn(document, 'referrer', 'get').mockReturnValue(externalApp.origin);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jsdom.reconfigure({
            url: EXTERNAL_WEBSITE.redirectUrl,
        });

        console.log('TONOMY_LOGIN_WEBSITE: collect external website token from URL');

        TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified = await UserApps.onRedirectLogin();
        expect(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified).toBeInstanceOf(Message);
        expect(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified.getSender()).toBe(EXTERNAL_WEBSITE.did);

        // Setup a request for the login app
        TONOMY_LOGIN_WEBSITE.jsKeyManager = new JsKeyManager();
        console.log('TONOMY_LOGIN_WEBSITE: create did:jwk and login request');
        TONOMY_LOGIN_WEBSITE.loginRequestJwt = (await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            TONOMY_LOGIN_WEBSITE.jsKeyManager
        )) as string;
        TONOMY_LOGIN_WEBSITE.did = new Message(TONOMY_LOGIN_WEBSITE.loginRequestJwt).getSender();
        expect(TONOMY_LOGIN_WEBSITE.did).toContain('did:jwk:');
        expect(TONOMY_LOGIN_WEBSITE.did).not.toEqual(EXTERNAL_WEBSITE.did);

        TONOMY_LOGIN_WEBSITE.jwtRequests = [EXTERNAL_WEBSITE.loginRequestJwt, TONOMY_LOGIN_WEBSITE.loginRequestJwt];

        // Create a new login message, and take the DID (did:jwk) out as their identity
        // Tonomy ID will scan the DID in barcode and use connect
        TONOMY_LOGIN_WEBSITE.logInMessage = new Message(TONOMY_LOGIN_WEBSITE.loginRequestJwt);
        TONOMY_LOGIN_WEBSITE.did = TONOMY_LOGIN_WEBSITE.logInMessage.getSender();
        expect(TONOMY_LOGIN_WEBSITE.logInMessage).toBeInstanceOf(Message);

        // Login to the Tonomy Communication as the login app user
        console.log('TONOMY_LOGIN_WEBSITE: connect to Tonomy Communication');
        TONOMY_LOGIN_WEBSITE.communication = new Communication();
        TONOMY_LOGIN_WEBSITE.loginResponse = await TONOMY_LOGIN_WEBSITE.communication.login(
            TONOMY_LOGIN_WEBSITE.logInMessage
        );
        expect(TONOMY_LOGIN_WEBSITE.loginResponse).toBe(true);

        // setup subscriber for connection to Tonomy ID acknowledgement
        TONOMY_LOGIN_WEBSITE.subscriberExecutor = (resolve: any) => {
            TONOMY_LOGIN_WEBSITE.messageSubscriber = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID.did);

                if (receivedMessage.getPayload().type === 'ack') {
                    console.log('TONOMY_LOGIN_WEBSITE: receive connection acknowledgement from Tonomy ID');
                    // we receive the ack message after Tonomy ID scans our QR code
                    resolve({ message: receivedMessage, type: 'ack' });
                } else {
                    console.log('TONOMY_LOGIN_WEBSITE: receive receipt of login request from Tonomy ID');
                    // we receive a message after Tonomy ID user confirms consent to the login request
                    resolve({ message: receivedMessage, type: 'request' });
                    // reject();
                }
            };
        };

        TONOMY_LOGIN_WEBSITE.ackMessagePromise = new Promise(TONOMY_LOGIN_WEBSITE.subscriberExecutor);

        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(0);
        TONOMY_LOGIN_WEBSITE.communication.subscribeMessage(TONOMY_LOGIN_WEBSITE.messageSubscriber);
        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(1);

        // ##### Tonomy ID user (QR code scanner screen) #####
        // ##########################
        console.log('TONOMY_ID: Scanning QR code with Tonomy ID app');

        // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
        TONOMY_ID.barcodeScanResults = {
            data: TONOMY_LOGIN_WEBSITE.did,
        };
        TONOMY_ID.connectMessage = await TONOMY_ID.user.signMessage({ type: 'ack' }, TONOMY_ID.barcodeScanResults.data);

        console.log("TONOMY_ID: connecting to Tonomy Login Website's with their did:jwk from the QR code");
        TONOMY_ID.sendMessageResponse = await TONOMY_ID.user.communication.sendMessage(TONOMY_ID.connectMessage);
        expect(TONOMY_ID.sendMessageResponse).toBe(true);

        // Setup a promise that resolves when the subscriber executes
        // This emulates the Tonomy ID app, which waits for the user requests
        TONOMY_ID.requestSubscriber = new Promise((resolve) => {
            TONOMY_ID.user.communication.subscribeMessage(async (m: any) => {
                console.log('TONOMY_ID: receive login requests from Tonomy Login Website');

                const message = new Message(m);

                // receive and verify the requests
                const requests = message.getPayload().requests;

                // TODO check this throws an error if requests are not valid, or not signed correctly
                console.log('TONOMY_ID: verifying login request');
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
                        expect(senderDid).toBe(EXTERNAL_WEBSITE.did);

                        console.log('TONOMY_ID: logging into external website by adding key to blockchain');
                        await TONOMY_ID.user.apps.loginWithApp(loginApp, PublicKey.from(payload?.publicKey));
                    } else if (loginApp.origin === tonomyLoginApp.origin) {
                        appsFound[0] = true;
                        expect(senderDid).toBe(TONOMY_LOGIN_WEBSITE.did);
                        tonomyIdLoginDid = senderDid;
                        console.log('TONOMY_ID: logging into Tonomy Login website by adding key to blockchain');
                        await TONOMY_ID.user.apps.loginWithApp(loginApp, PublicKey.from(payload?.publicKey));
                    } else {
                        throw new Error('Unknown app');
                    }
                }

                const accountName = await TONOMY_ID.user.storage.accountName.toString();

                // send a message back to the app
                const respondMessage = await TONOMY_ID.user.signMessage({ requests, accountName }, tonomyIdLoginDid);

                console.log('TONOMY_ID: sending a confirmation of the logins back to Tonomy Login Website');
                const sendMessageResponse = await TONOMY_ID.user.communication.sendMessage(respondMessage);

                console.log('TONOMY_ID: check');
                expect(sendMessageResponse).toBe(true);

                resolve(true);
            });
        });

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // wait for the ack message to confirm Tonomy ID is connected
        const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE.ackMessagePromise;

        expect(connectionMessageFromTonomyId.type).toBe('ack');
        expect(connectionMessageFromTonomyId.message.getSender()).toBe(TONOMY_ID.did + '#local');

        // then send a Message with the two signed requests, this will be received by the Tonomy ID app
        TONOMY_LOGIN_WEBSITE.requestMessage = await UserApps.signMessage(
            {
                requests: JSON.stringify(TONOMY_LOGIN_WEBSITE.jwtRequests),
            },
            TONOMY_LOGIN_WEBSITE.jsKeyManager,
            KeyManagerLevel.BROWSER_LOCAL_STORAGE,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            connectionMessageFromTonomyId.message.getSender()
        );

        console.log('TONOMY_LOGIN_WEBSITE: sending login request to Tonomy ID app');
        TONOMY_LOGIN_WEBSITE.sendMessageResponse = await TONOMY_LOGIN_WEBSITE.communication.sendMessage(
            TONOMY_LOGIN_WEBSITE.requestMessage
        );
        expect(TONOMY_LOGIN_WEBSITE.sendMessageResponse).toBe(true);

        // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
        TONOMY_LOGIN_WEBSITE.subscriberExecutor2 = (resolve: any) => {
            TONOMY_LOGIN_WEBSITE.messageSubscriber2 = (responseMessage: any) => {
                const receivedMessage = new Message(responseMessage);

                expect(receivedMessage.getSender()).toContain(TONOMY_ID.did);

                if (receivedMessage.getPayload().type === 'ack') {
                    console.log('TONOMY_LOGIN_WEBSITE2: receive connection acknowledgement from Tonomy ID');
                    // we receive the ack message after Tonomy ID scans our QR code
                    resolve({ message: receivedMessage, type: 'ack' });
                } else {
                    console.log('TONOMY_LOGIN_WEBSITE2: receive receipt of login request from Tonomy ID');
                    // we receive a message after Tonomy ID user confirms consent to the login request
                    resolve({ message: receivedMessage, type: 'request' });
                    // reject();
                }
            };
        };

        TONOMY_LOGIN_WEBSITE.requestsConfirmedMessagePromise = new Promise(TONOMY_LOGIN_WEBSITE.subscriberExecutor2);

        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(1);
        TONOMY_LOGIN_WEBSITE.communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE.messageSubscriber);
        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(0);
        TONOMY_LOGIN_WEBSITE.communication.subscribeMessage(TONOMY_LOGIN_WEBSITE.messageSubscriber2);
        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(1);

        // ##### Tonomy ID user (SSO screen) #####
        // ##########################

        // Wait for the subscriber to execute
        console.log('TONOMY_ID: check100');
        await TONOMY_ID.requestSubscriber;

        // TODO for some reason need to sleep here, otherwise the TONOMY_ID.requestSubscriber doesn't finish
        console.log('TONOMY_ID: check101');
        await sleep(5000);
        // TODO next line never executes
        console.log('TONOMY_ID: check102');

        // check both apps were logged into
        expect(appsFound[0] && appsFound[1]).toBe(true);
        console.log('appsFound', appsFound);

        // #####Tonomy Login App website user (callback page) #####
        // ########################################

        // Receive the message back, and redirect to the callback
        console.log('stuff');

        const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE.requestsConfirmedMessagePromise;

        console.log('requestConfirmedMessageFromTonomyId', requestConfirmedMessageFromTonomyId);

        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(1);
        TONOMY_LOGIN_WEBSITE.communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE.messageSubscriber2);
        expect(TONOMY_LOGIN_WEBSITE.communication.socketServer.listeners('message').length).toBe(0);

        expect(requestConfirmedMessageFromTonomyId.type).toBe('request');
        const payload = requestConfirmedMessageFromTonomyId.message.getPayload();

        expect(payload).toBeDefined();
        expect(payload.requests).toBeDefined();
        console.log('payload.requests', payload);

        /*
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // jsdom.reconfigure({
        //     url: TONOMY_ID.redirectRequestsUrl,
        // });

        // const { result: recievedRequestJwts, accountName, username } = await UserApps.onAppRedirectVerifyRequests();

        // expect(accountName).toBe(await TONOMY_ID.user.getAccountName());
        // expect(username).toBe((await TONOMY_ID.user.getUsername()).username);

        // const redirectJwt = recievedRequestJwts.find(
        //     (jwtVerified) => jwtVerified.getPayload().origin !== tonomyLoginApp.origin
        // );
        // const ssoJwt = recievedRequestJwts.find(
        //     (jwtVerified) => jwtVerified.getPayload().origin === externalApp.origin
        // );

        /*
            if (!redirectJwt) throw new Error('No redirectJwt found');

            const verifiedTonomyLoginSso = await UserApps.verifyKeyExistsForApp(accountName, TONOMY_LOGIN_WEBSITE.jsKeyManager);

            // TODO probably need to use same jsKeyManager for this to pass
            expect(verifiedTonomyLoginSso).toBe(true);

            // #####External website user (callback page) #####
            // ################################

            // const { accountName } = await UserApps.onAppRedirectVerifyRequests();
            // const verifiedExternalWebsiteLoginSso = await UserApps.verifyKeyExistsForApp(
            //     accountName,
            //     EXTERNAL_WEBSITE.jsKeyManager
            // );

            // TODO probably need to use same jsKeyManager for this to pass
            // expect(verifiedExternalWebsiteLoginSso).toBe(true);
            // Close connections
            await tonomyLoginAppUserCommunication.disconnect();
*/
        await TONOMY_LOGIN_WEBSITE.communication.disconnect();
        await TONOMY_ID.user.logout();
    });
});
