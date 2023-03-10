/* eslint-disable @typescript-eslint/no-unused-vars */

// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import { setSettings, Message, UserApps, Communication, KeyManagerLevel } from '../src/index';
import settings from './services/settings';
import URL from 'jsdom-url';
import { ExternalUser } from '../src/externalUser';
import { JsKeyManager } from '../test/services/jskeymanager';

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
        TONOMY_ID.user = (await createRandomID()).user;

        // Login to Tonomy Communication as the user (did:antelope)
        TONOMY_ID.loginMessage = await TONOMY_ID.user.signMessage({});

        TONOMY_ID.loginResponse = await TONOMY_ID.user.communication.login(TONOMY_ID.loginMessage);

        expect(TONOMY_ID.loginResponse).toBe(true);

        // Create two apps which will be logged into
        const externalApp = await createRandomApp();
        const tonomyLoginApp = await createRandomApp();
        // const appsFound = [false, false];

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
        EXTERNAL_WEBSITE.loginRequestJwt = await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            EXTERNAL_WEBSITE.jsKeyManager
        );
        expect(typeof EXTERNAL_WEBSITE.loginRequestJwt).toBe('string');
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

        TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified = await UserApps.onRedirectLogin();
        expect(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified).toBeInstanceOf(Message);
        expect(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified.getSender()).toContain('did:jwk');

        // Setup a request for the login app
        TONOMY_LOGIN_WEBSITE.jsKeyManager = new JsKeyManager();
        TONOMY_LOGIN_WEBSITE.loginRequestJwt = (await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            TONOMY_LOGIN_WEBSITE.jsKeyManager
        )) as string;
        TONOMY_LOGIN_WEBSITE.jwtRequests = [EXTERNAL_WEBSITE.loginRequestJwt, TONOMY_LOGIN_WEBSITE.loginRequestJwt];

        // Create a new login message, and take the DID (did:jwk) out as their identity
        // Tonomy ID will scan the DID in barcode and use connect
        TONOMY_LOGIN_WEBSITE.logInMessage = new Message(TONOMY_LOGIN_WEBSITE.loginRequestJwt);
        TONOMY_LOGIN_WEBSITE.did = TONOMY_LOGIN_WEBSITE.logInMessage.getSender();
        expect(TONOMY_LOGIN_WEBSITE.logInMessage).toBeInstanceOf(Message);
        expect(TONOMY_LOGIN_WEBSITE.did).toContain('did:jwk');
        expect(TONOMY_LOGIN_WEBSITE.did).not.toEqual(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified.getSender());

        // Login to the Tonomy Communication as the login app user
        TONOMY_LOGIN_WEBSITE.communication = new Communication();
        TONOMY_LOGIN_WEBSITE.loginResponse = await TONOMY_LOGIN_WEBSITE.communication.login(
            TONOMY_LOGIN_WEBSITE.logInMessage
        );
        expect(TONOMY_LOGIN_WEBSITE.loginResponse).toBe(true);

        // Setup a promise that resolves when the subscriber executes
        // This emulates the Tonomy Login app, which sends requests to the Tonomy ID app and then waits for the response
        TONOMY_LOGIN_WEBSITE.receivedMessageFromTonomyId as Message;
        TONOMY_LOGIN_WEBSITE.receiveMessageSubscriber = new Promise((resolve, reject) => {
            let resolved = false;

            // wait for login acknowledgement
            TONOMY_LOGIN_WEBSITE.communication.subscribeMessage(async (responseMessage: any) => {
                try {
                    const receivedMessage = new Message(responseMessage);

                    if (receivedMessage.getPayload().type === 'ack') {
                        expect(receivedMessage.getSender()).toContain(await TONOMY_ID.user.getDid());

                        TONOMY_LOGIN_WEBSITE.receivedMessageFromTonomyId = receivedMessage;
                        resolved = true;
                        resolve(true);
                        return;
                    } else {
                        reject('ack not received');
                    }
                } catch (e) {
                    reject(e);
                }
            });
            setTimeout(() => {
                if (resolved) return;
                // reject if this takes too long
                reject('Subscriber timed out');
            }, 10000);
        });

        // ##### Tonomy ID user (QR code scanner screen) #####
        // ##########################

        // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
        TONOMY_ID.barcodeScanResults = {
            data: TONOMY_LOGIN_WEBSITE.did,
        };
        TONOMY_ID.connectMessage = await TONOMY_ID.user.signMessage({ type: 'ack' }, TONOMY_ID.barcodeScanResults.data);

        TONOMY_ID.sendMessageResponse = await TONOMY_ID.user.communication.sendMessage(TONOMY_ID.connectMessage);
        expect(TONOMY_ID.sendMessageResponse).toBe(true);

        // Setup a promise that resolves when the subscriber executes
        // This emulates the Tonomy ID app, which waits for the user requests
        TONOMY_ID.requestSubscriber = new Promise((resolve, reject) => {
            let resolved = false;

            TONOMY_ID.user.communication.subscribeMessage(async (m: any) => {
                try {
                    const message = new Message(m);

                    // receive and verify the requests
                    const requests = message.getPayload().requests;

                    expect(requests).toBeInstanceOf(Array);
                    expect(requests.length).toBe(2);
                    /*
                    // TODO check this throws an error if requests are not valid, or not signed correctly
                    const verifiedRequests = await UserApps.verifyRequests(requests);

                    expect(verifiedRequests.length).toBe(2);

                    for (const jwt of verifiedRequests) {
                        // parse the requests for their app data
                        const payload = jwt.getPayload() as JWTLoginPayload;
                        const loginApp = await App.getApp(payload.origin);
                        const senderDid = jwt.getSender();

                        if (loginApp.origin === externalApp.origin) {
                            appsFound[1] = true;
                            expect(senderDid).toBe(EXTERNAL_WEBSITE.did);
                        }

                        if (loginApp.origin === tonomyLoginApp.origin) {
                            appsFound[0] = true;
                            expect(senderDid).toBe(TONOMY_LOGIN_WEBSITE.did);

                            const accountName = await TONOMY_ID.user.storage.accountName.toString();

                            // login to the app (by adding a permission on the blockchain)
                            await TONOMY_ID.user.apps.loginWithApp(loginApp, PublicKey.from(payload?.publicKey));

                            // send a message back to the app
                            const message = await TONOMY_ID.user.signMessage({ requests, accountName }, senderDid);

                            await TONOMY_ID.user.communication.sendMessage(message);
                        }
                    }
*/
                    resolved = true;
                    resolve(true);
                    return;
                } catch (e) {
                    reject(e);
                }
            });

            setTimeout(() => {
                if (resolved) return;
                // reject if this takes too long
                reject('Subscriber timed out');
            }, 10000);
        });

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // wait for the login subscriber to execute
        // console.log('waiting for login subscriber to execute', TONOMY_LOGIN_WEBSITE.receivedMessageFromTonomyId);
        await TONOMY_LOGIN_WEBSITE.receiveMessageSubscriber;
        expect(TONOMY_LOGIN_WEBSITE.receivedMessageFromTonomyId.getSender()).toContain('did:antelope');

        // then send a Message with the two signed requests, this will be received by the Tonomy ID app
        TONOMY_LOGIN_WEBSITE.requestMessage = await UserApps.signMessage(
            {
                requests: TONOMY_LOGIN_WEBSITE.jwtRequests,
            },
            TONOMY_LOGIN_WEBSITE.jsKeyManager,
            KeyManagerLevel.BROWSER_LOCAL_STORAGE,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            TONOMY_LOGIN_WEBSITE.receivedMessageFromTonomyId.getSender()
        );

        TONOMY_LOGIN_WEBSITE.sendMessageResponse = await TONOMY_LOGIN_WEBSITE.communication.sendMessage(
            TONOMY_LOGIN_WEBSITE.requestMessage
        );
        // expect(TONOMY_LOGIN_WEBSITE.sendMessageResponse).toBe(true);
        // ##### Tonomy ID user (SSO screen) #####
        // ##########################

        // Wait for the subscriber to execute
        await TONOMY_ID.requestSubscriber;
        /*
            // check both apps were logged into
            expect(appsFound[0] && appsFound[1]).toBe(true);

            // #####Tonomy Login App website user (callback page) #####
            // ########################################

            const { result: recievedRequestJwts, accountName, username } = await UserApps.onAppRedirectVerifyRequests();

            expect(accountName).toBe(await tonomyIdUser.getAccountName());
            expect(username).toBe((await tonomyIdUser.getUsername()).username);

            const redirectJwt = recievedRequestJwts.find(
                (jwtVerified) => jwtVerified.getPayload().origin !== tonomyLoginApp.origin
            );
            const ssoJwt = recievedRequestJwts.find(
                (jwtVerified) => jwtVerified.getPayload().origin === externalApp.origin
            );

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
        await TONOMY_ID.user.logout();
    });
});
