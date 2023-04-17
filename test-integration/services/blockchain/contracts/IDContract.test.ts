import { IDContract, setSettings } from '../../../../src/sdk/index';
import { createRandomID, createRandomApp } from '../../../helpers/user';
import settings from '../../../helpers/settings';

setSettings(settings);

const idContract = IDContract.Instance;

describe('IDContract class', () => {
    beforeEach((): void => {
        jest.setTimeout(60000);
    });

    test('getPerson(): Fetch ID details of a user', async () => {
        const { user } = await createRandomID();

        const accountName = await user.storage.accountName;
        const username = await user.storage.username;
        const salt = await user.storage.salt;

        // get by account name
        let idInfo = await idContract.getPerson(accountName);

        expect(idInfo.account_name).toEqual(accountName);
        expect(idInfo.username_hash.toString()).toEqual(username.usernameHash);
        expect(idInfo.status).toEqual(1); // 1 = READY. TODO turn into enum string
        // expect(idInfo.type).toEqual(0); // 0 = Person // TODO bring back type property (as enum string) based on account_name[0] character
        expect(idInfo.account_name.toString()[0]).toEqual('p'); // p = person
        expect(idInfo.password_salt).toEqual(salt);
        expect(idInfo.version).toBe(1);

        // get by username
        idInfo = await idContract.getPerson(username);
        expect(idInfo.account_name.toString()).toEqual(accountName.toString());
        expect(idInfo.username_hash.toString()).toEqual(username.usernameHash);

        // Close connections
        await user.logout();
    });

    test('newapp and getApp', async () => {
        const { appName, description, username, logoUrl, origin, accountName } = await createRandomApp();

        let appInfo = await idContract.getApp(username);

        expect(appInfo.app_name).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.username_hash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logo_url).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.account_name.toString()).toEqual(accountName.toString());

        appInfo = await idContract.getApp(origin);

        expect(appInfo.app_name).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.username_hash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logo_url).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.account_name.toString()).toEqual(accountName.toString());

        appInfo = await idContract.getApp(accountName);

        expect(appInfo.app_name).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.username_hash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logo_url).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.account_name.toString()).toEqual(accountName.toString());
    });
});
