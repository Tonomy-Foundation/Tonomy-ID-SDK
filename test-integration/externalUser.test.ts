// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from './util/user';
import { setSettings, User, AppStatus, Message, UserApps, JWTLoginPayload, App } from '../src/index';
import settings from './services/settings';
import { catchAndPrintErrors } from './util/errors';
import { PublicKey } from '@greymass/eosio';

setSettings(settings);

describe('External User class', () => {
    test(
        'loginWithTonomy(): Logs into new app',
        catchAndPrintErrors(async () => {
            expect.assertions(1);
            // Create new Tonomy ID user
            const { user, auth } = await createRandomID();
            const userAccountName = await user.storage.accountName;

            // Login to Tonomy Communication
            const message = await user.signMessage({});

            await user.communication.login(message);

            // Create two apps
            const app = await createRandomApp();
            const app2 = await createRandomApp();

            // Setup a promise that resolves when the subscriber executes
            const subscriberPromise = new Promise((resolve, reject) => {
                user.communication.subscribeMessage(async (m) => {
                    const message = new Message(m);

                    const requests = message.getPayload().requests;

                    const verifiedRequests = await UserApps.verifyRequests(requests);

                    expect(verifiedRequests.length).toBe(2);

                    for (const jwt of verifiedRequests) {
                        const payload = jwt.getPayload() as JWTLoginPayload;
                        const app = await App.getApp(payload.origin);

                        const accountName = await user.storage.accountName.toString();

                        await user.apps.loginWithApp(app, PublicKey.from(payload?.publicKey));

                        const recieverDid = jwt.getSender();
                        const message = await user.signMessage({ requests, accountName }, recieverDid);

                        user.communication.sendMessage(message);
                    }

                    resolve(true);
                });
            });

            // Wait for the subscriber to execute
            await subscriberPromise;

            // Close connections
            await user.logout();
        })
    );
});
