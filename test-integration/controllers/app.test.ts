// need to use API types from inside tonomy-id-sdk, otherwise type compatibility issues
import { createRandomApp, createRandomID } from '../helpers/user';
import { setSettings, User, AppStatus, generateRandomKeyPair } from '../../src/sdk/index';
import settings from '../helpers/settings';
import { catchAndPrintErrors } from '../helpers/errors';

setSettings(settings);

describe('App class', () => {
    test(
        'loginWithApp(): Logs into new app',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();
            const userAccountName = await user.storage.accountName;

            const app = await createRandomApp();
            const newKey = generateRandomKeyPair().privateKey;

            await user.apps.loginWithApp(app, newKey.toPublic());

            const accountInfo = await User.getAccountInfo(userAccountName);

            const permissions = accountInfo.permissions;
            const appPermission = permissions.find((p) => p.perm_name.toString() === app.accountName.toString());

            expect(appPermission).toBeDefined();
            expect(appPermission?.parent.toString()).toEqual('local');
            expect(appPermission?.required_auth.keys[0].key.toString()).toEqual(newKey.toPublic().toString());

            const userApps = await user.apps.storage.appRecords;

            expect(userApps.length).toBe(1);
            const myApp = userApps[0];

            expect(myApp.app.accountName.toString()).toEqual(app.accountName.toString());
            expect(myApp.status).toEqual(AppStatus.READY);
            expect(myApp.added).toBeDefined();

            // Close connections
            await user.logout();
        })
    );
});
