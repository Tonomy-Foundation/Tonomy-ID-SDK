// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import { setSettings, Message, UserApps, JWTLoginPayload, App, KeyManager } from '../src/index';
import settings from './services/settings';
import URL from 'jsdom-url';
import { PublicKey } from '@greymass/eosio';
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
        const appsFound = [false, false];

        // Setup a promise that resolves when the subscriber executes
        // This emulates the Tonomy ID app, which waits for the user requests
        TONOMY_ID.requestSubscriber = new Promise((resolve, reject) => {
            let resolved = false;

            TONOMY_ID.user.communication.subscribeMessage(async (m: any) => {
                try {
                    const message = new Message(m);

                    // receive and verify the requests
                    const requests = message.getPayload().requests;

                    // TODO check this throws an error if requests are not valid, or not signed correctly
                    const verifiedRequests = await UserApps.verifyRequests(requests);

                    expect(verifiedRequests.length).toBe(2);

                    for (const jwt of verifiedRequests) {
                        // parse the requests for their app data
                        const payload = jwt.getPayload() as JWTLoginPayload;
                        const loginApp = await App.getApp(payload.origin);

                        if (loginApp.origin === tonomyLoginApp.origin) appsFound[0] = true;
                        if (loginApp.origin === externalApp.origin) appsFound[1] = true;

                        const accountName = await TONOMY_ID.user.storage.accountName.toString();

                        // login to the app (by adding a permission on the blockchain)
                        await TONOMY_ID.user.apps.loginWithApp(loginApp, PublicKey.from(payload?.publicKey));

                        // send a message back to the app
                        const recieverDid = jwt.getSender();
                        const message = await TONOMY_ID.user.signMessage({ requests, accountName }, recieverDid);

                        await TONOMY_ID.user.communication.sendMessage(message);
                    }

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
        // TODO need to wait for this to resolve, otherwise it will fail

        // #####External website user (login page) #####
        // ################################

        // create request for external website
        // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
        // Instead we take the token as output
        jsdom.reconfigure({
            url: externalApp.origin + '/login',
        });
        EXTERNAL_WEBSITE.loginRequestJwt = ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            new JsKeyManager() as unknown as KeyManager
        );

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // catch the externalAppToken in the URL
        // TODO: check this throws an error if the token is not valid or in the URL
        jsdom.reconfigure({
            url: tonomyLoginApp.origin + '/login',
        });

        TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified = await UserApps.onRedirectLogin();
        expect(TONOMY_LOGIN_WEBSITE.externalWebsiteJwtVerified).toBeInstanceOf(Message);
        /*

        // Setup a request for the login app
        const tonomyLoginAppJwt = (await ExternalUser.loginWithTonomy(
            { callbackPath: '/callback', redirect: false },
            new JsKeyManager()
        )) as string;

        const jwtRequests = [externalAppJwt, tonomyLoginAppJwt];

        // Create a new login message, and take the DID (did:jwk) out as their identity
        // Tonomy ID will scan the DID in barcode and use connect
        const logInMessage = new Message(tonomyLoginAppJwt);
        const tonomyLoginAppDid = logInMessage.getSender();

        // Login to the Tonomy Communication as the login app user
        const tonomyLoginAppUserCommunication = new Communication();

        await tonomyLoginAppUserCommunication.login(logInMessage);
            // ##### Tonomy ID user (QR code scanner screen) #####
            // ##########################

            // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
            const barcodeScanResults = {
                data: tonomyLoginAppDid,
            };
            const tonomyIdToLoginAppConnectMessage = await tonomyIdUser.signMessage(
                { type: 'ack' },
                barcodeScanResults.data
            );

            await tonomyIdUser.communication.sendMessage(tonomyIdToLoginAppConnectMessage);

            // ##### Tonomy ID user (SSO screen screen) #####
            // ##########################

            // Setup a promise that resolves when the subscriber executes
            // This emulates the Tonomy Login app, which sends requests to the Tonomy ID app and then waits for the response
            let messageFromTonomyIdUser: Message;
            const tonomyLoginSubscriberPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    // reject if this takes too long
                    reject('Subscriber timed out');
                }, 10000);
                // wait for login acknowledgement
                tonomyLoginAppUserCommunication.subscribeMessage(async (responseMessage) => {
                    try {
                        messageFromTonomyIdUser = new Message(responseMessage);

                        if (messageFromTonomyIdUser.getPayload().type === 'ack') {
                            resolve(true);
                        } else {
                            reject('ack not received');
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            // #####Tonomy Login App website user (login page) #####
            // ########################################

            // wait for the login subscriber to execute
            await tonomyLoginSubscriberPromise;

            // then send a Message with the two signed requests, this will be received by the Tonomy ID app
            const requestMessage = await UserApps.signMessage(
                {
                    requests: jwtRequests,
                },
                new JsKeyManager(),
                KeyManagerLevel.BROWSER_LOCAL_STORAGE,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                messageFromTonomyIdUser.getSender()
            );

            await tonomyLoginAppUserCommunication.sendMessage(requestMessage);

            // ##### Tonomy ID user (SSO screen) #####
            // ##########################

            // Wait for the subscriber to execute
            await tonomyIdSubscriberPromise;

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

            const verifiedTonomyLoginSso = await UserApps.verifyKeyExistsForApp(accountName, new JsKeyManager());

            // TODO probably need to use same jsKeyManager for this to pass
            expect(verifiedTonomyLoginSso).toBe(true);

            // #####External website user (callback page) #####
            // ################################

            // const { accountName } = await UserApps.onAppRedirectVerifyRequests();
            // const verifiedExternalWebsiteLoginSso = await UserApps.verifyKeyExistsForApp(
            //     accountName,
            //     new JsKeyManager() as unknown as KeyManager
            // );

            // TODO probably need to use same jsKeyManager for this to pass
            // expect(verifiedExternalWebsiteLoginSso).toBe(true);
            // Close connections
            await tonomyLoginAppUserCommunication.disconnect();
*/
        await TONOMY_ID.user.logout();
    });
});
