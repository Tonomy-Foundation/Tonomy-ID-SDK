/**
 * @jest-environment jsdom
 */
import { tonomyContract } from '../../../../src/sdk';
import { createRandomID, createRandomApp } from '../../../helpers/user';
import { jest } from '@jest/globals';

describe('TonomyContract class', () => {
    beforeEach((): void => {
        jest.setTimeout(60000);
    });

    test('getPerson(): Fetch ID details of a user', async () => {
        const { user } = await createRandomID();

        const accountName = await user.storage.accountName;
        const username = await user.getUsername();
        const salt = await user.storage.salt;

        // get by account name
        let idInfo = await tonomyContract.getPerson(accountName);

        expect(idInfo.accountName).toEqual(accountName);
        expect(idInfo.usernameHash.toString()).toEqual(username.usernameHash);
        expect(idInfo.status).toEqual(1); // 1 = READY. TODO: turn into enum string
        // expect(idInfo.type).toEqual(0); // 0 = Person // TODO: bring back type property (as enum string) based on account_name[0] character
        expect(idInfo.accountName.toString()[0]).toEqual('p'); // p = person
        expect(idInfo.passwordSalt).toEqual(salt);
        // expect(idInfo.version).toBe(1);

        // get by username
        idInfo = await tonomyContract.getPerson(username);
        expect(idInfo.accountName.toString()).toEqual(accountName.toString());
        expect(idInfo.usernameHash.toString()).toEqual(username.usernameHash);

        // Close connections
        await user.logout();
    }, 8000);

    test('newapp and getApp', async () => {
        const { appName, description, username, logoUrl, origin, accountName } = await createRandomApp();

        if (!username) throw new Error('Username not found');

        let appInfo = await tonomyContract.getApp(username);

        expect(appInfo.appName).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.usernameHash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logoUrl).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.accountName.toString()).toEqual(accountName.toString());

        appInfo = await tonomyContract.getApp(origin);

        expect(appInfo.appName).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.usernameHash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logoUrl).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.accountName.toString()).toEqual(accountName.toString());

        appInfo = await tonomyContract.getApp(accountName);

        expect(appInfo.appName).toEqual(appName);
        expect(appInfo.description).toEqual(description);
        expect(appInfo.usernameHash.toString()).toEqual(username.usernameHash);
        expect(appInfo.logoUrl).toEqual(logoUrl);
        expect(appInfo.origin).toEqual(origin);
        expect(appInfo.accountName.toString()).toEqual(accountName.toString());
    });
});
