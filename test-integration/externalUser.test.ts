// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import {
    setSettings,
    User,
    AppStatus,
    Message,
    UserApps,
    JWTLoginPayload,
    App,
    KeyManager,
    Communication,
    KeyManagerLevel,
} from '../src/index';
import settings from './services/settings';
import { catchAndPrintErrors } from './util/errors';
import { PublicKey } from '@greymass/eosio';
import { ExternalUser } from '../src/externalUser';
import { JsKeyManager } from '../test/services/jskeymanager';

setSettings(settings);

describe('External User class', () => {
    test(
        'full login to external app success flow',
        catchAndPrintErrors(async () => {
            expect.assertions(1);
            // ##### Tonomy ID user #####
            // ##########################

            // Create new Tonomy ID user
            const { user: tonomyIdUser, auth } = await createRandomID();
            const userAccountName = await tonomyIdUser.storage.accountName;

            // Login to Tonomy Communication as the user (did:antelope)
            const message = await tonomyIdUser.signMessage({});

            await tonomyIdUser.communication.login(message);

            // Create two apps which will be logged into
            const externalApp = await createRandomApp();
            const tonomyLoginApp = await createRandomApp();
            const appsFound = [false, false];

            // Setup a promise that resolves when the subscriber executes
            // This emulates the Tonomy ID app, which waits for the user requests
            const tonomyIdSubscriberPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    // reject if this takes too long
                    reject('Subscriber timed out');
                }, 10000);
                tonomyIdUser.communication.subscribeMessage(async (m) => {
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

                            const accountName = await tonomyIdUser.storage.accountName.toString();

                            // login to the app (by adding a permission on the blockchain)
                            await tonomyIdUser.apps.loginWithApp(loginApp, PublicKey.from(payload?.publicKey));

                            // send a message back to the app
                            const recieverDid = jwt.getSender();
                            const message = await tonomyIdUser.signMessage({ requests, accountName }, recieverDid);

                            await tonomyIdUser.communication.sendMessage(message);
                        }

                        resolve(true);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            // #####External website user (login page) #####
            // ################################

            // create request for external website
            // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
            // Instead we take the token as output
            const externalAppJwt = ExternalUser.loginWithTonomy(
                { callbackPath: '/callback', redirect: false },
                new JsKeyManager() as unknown as KeyManager
            );

            // #####Tonomy Login App website user (login page) #####
            // ########################################

            // catch the externalAppToken in the URL
            // TODO: check this throws an error if the token is not valid or in the URL
            // NOTE how will this work in the test?
            const externalAppJwtVerified = await UserApps.onRedirectLogin();

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
            await tonomyIdUser.logout();
            await tonomyLoginAppUserCommunication.disconnect();
        })
    );
});
