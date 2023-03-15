import { api } from './util/eosio';
import { createRandomID } from './util/user';
import { KeyManager, KeyManagerLevel, TonomyUsername, User, createUserObject, setSettings } from '../src/index';
import { SdkError, SdkErrors } from '../src/index';
import { JsKeyManager } from '../test/services/jskeymanager';
import { jsStorageFactory } from '../test/services/jsstorage';
import settings from './services/settings';
import { catchAndPrintErrors } from './util/errors';

let auth: KeyManager;
let user: User;

setSettings(settings);

describe('User class', () => {
    beforeEach((): void => {
        jest.setTimeout(60000);
        auth = new JsKeyManager();
        user = createUserObject(auth, jsStorageFactory);
    });

    afterEach(async () => {
        await user.logout();
    });

    test(
        'savePassword() generates and saves new private key',
        catchAndPrintErrors(async () => {
            expect(user.savePassword).toBeDefined();

            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).rejects.toThrowError(Error);
            expect(await user.storage.salt).not.toBeDefined();
            await user.savePassword('n4RR8mj!cC$VaG907bq4');
            expect(user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).resolves.toBeDefined();
            expect(await user.storage.salt).toBeDefined();
        })
    );

    test(
        'savePIN() saves new private key',
        catchAndPrintErrors(async () => {
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PIN })).rejects.toThrowError(Error);
            await user.savePIN('4568');
            expect(user.keyManager.getKey({ level: KeyManagerLevel.PIN })).resolves.toBeDefined();
        })
    );

    test(
        'saveFingerprint() saves new private key',
        catchAndPrintErrors(async () => {
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.FINGERPRINT })).rejects.toThrowError(Error);
            await user.saveFingerprint();
            expect(user.keyManager.getKey({ level: KeyManagerLevel.FINGERPRINT })).resolves.toBeDefined();
        })
    );

    test(
        'saveLocal() saves new private key',
        catchAndPrintErrors(async () => {
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).rejects.toThrowError(Error);
            await user.saveLocal();
            expect(user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).resolves.toBeDefined();
        })
    );

    test(
        'createPerson(): Create a new ID of a person',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            const accountName = await user.storage.accountName;

            const accountInfo = await api.v1.chain.get_account(accountName);

            expect(accountInfo).toBeDefined();
            expect(accountInfo.account_name.toString()).toBe(accountName.toString());

            // Password key
            expect(accountInfo.getPermission('owner').required_auth.threshold.toNumber()).toBe(1);
            expect(accountInfo.getPermission('owner').required_auth.keys[0].key).toBeDefined();

            // PIN key
            expect(accountInfo.getPermission('pin').parent.toString()).toBe('owner');
            expect(accountInfo.getPermission('pin').required_auth.threshold.toNumber()).toBe(1);
            expect(accountInfo.getPermission('pin').required_auth.keys[0].key).toBeDefined();

            // Fingerprint key
            expect(accountInfo.getPermission('fingerprint').parent.toString()).toBe('owner');
            expect(accountInfo.getPermission('fingerprint').required_auth.threshold.toNumber()).toBe(1);
            expect(accountInfo.getPermission('fingerprint').required_auth.keys[0].key).toBeDefined();

            // Local key
            expect(accountInfo.getPermission('local').parent.toString()).toBe('owner');
            expect(accountInfo.getPermission('local').required_auth.threshold.toNumber()).toBe(1);
            expect(accountInfo.getPermission('local').required_auth.keys[0].key).toBeDefined();

            // Active key
            expect(accountInfo.getPermission('active').parent.toString()).toBe('owner');
            expect(accountInfo.getPermission('active').required_auth.threshold.toNumber()).toBe(1);
            expect(accountInfo.getPermission('active').required_auth.keys[0].key).toBeDefined();

            // Close connections
            await user.logout();
        })
    );

    test(
        'login() logs in with password',
        catchAndPrintErrors(async () => {
            const { user, password } = await createRandomID();

            const username = await user.storage.username;

            const newKeyManager = new JsKeyManager();
            const userLogin = createUserObject(newKeyManager, jsStorageFactory);

            expect(userLogin.isLoggedIn()).resolves.toBeFalsy();
            const idInfo = await userLogin.login(username, password);

            expect(idInfo.username_hash.toString()).toBe(username.usernameHash);
            expect(userLogin.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).resolves.toBeDefined();
            expect(await userLogin.storage.accountName).toBeDefined();
            expect(await userLogin.storage.username.username).toBe(username.username);
            expect(userLogin.isLoggedIn()).toBeTruthy();

            // Close connections
            await user.logout();
            await userLogin.logout();
        })
    );

    test(
        'login() fails with wrong password',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            const username = await user.storage.username;

            const newKeyManager = new JsKeyManager();
            const userLogin = createUserObject(newKeyManager, jsStorageFactory);

            await expect(() => userLogin.login(username, 'differentpassword')).rejects.toThrowError(Error);

            // Close connections
            await user.logout();
            await userLogin.logout();
        })
    );

    test(
        'checkKeysStillValid() keys are still valid after create account',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            await expect(user.checkKeysStillValid()).resolves.toBeTruthy();

            // Close connections
            await user.logout();
        })
    );

    test(
        'checkKeysStillValid() keys are still valid after create account and login again',
        catchAndPrintErrors(async () => {
            const { user, password } = await createRandomID();

            await user.savePIN('1234');
            await user.saveLocal();
            await user.updateKeys(password);

            await expect(user.checkKeysStillValid()).resolves.toBeTruthy();

            // Close connections
            await user.logout();
        })
    );

    test(
        'checkKeysStillValid() keys are not valid after login and change keys but not update yet',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            // Emulate that user updates their keys, but not the blockchain yet
            await user.saveLocal();
            await user.savePIN('1234');

            await expect(user.checkKeysStillValid()).rejects.toThrowError(SdkErrors.KeyNotFound);

            // Close connections
            // TODO if expect fails, then the user.logout() is not called and we dont cleanup. We need to fix this
            await user.logout();
        })
    );

    test(
        "checkKeysStillValid() throws error if user doesn't exist",
        catchAndPrintErrors(async () => {
            await expect(user.checkKeysStillValid()).rejects.toThrowError(SdkErrors.AccountDoesntExist);
        })
    );

    test(
        "checkPassword() throws error if password doesn't match",
        catchAndPrintErrors(async () => {
            const { user, password } = await createRandomID();

            await user.login(await user.getUsername(), password);

            await expect(user.checkPassword('Testing123!@')).rejects.toThrowError(SdkErrors.PasswordInValid);
            await expect(user.checkPassword('password')).rejects.toThrowError(SdkErrors.PasswordFormatInvalid);

            await user.logout();
        })
    );

    test(
        'checkPassword() returns true when password matches',
        catchAndPrintErrors(async () => {
            const { user, password } = await createRandomID();

            await user.login(await user.getUsername(), password);

            await expect(user.checkPassword(password)).resolves.toBeTruthy();
            await expect(user.checkPassword(password)).resolves.toBe(true);

            await user.logout();
        })
    );

    test(
        'logout',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            await user.logout();

            expect(await user.storage.status).toBeFalsy();
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).rejects.toThrowError(Error);
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PIN })).rejects.toThrowError(Error);
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.FINGERPRINT })).rejects.toThrowError(Error);
            expect(() => user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).rejects.toThrowError(Error);
            expect(user.isLoggedIn()).resolves.toBeFalsy();

            // Close connections
            await user.logout();
        })
    );

    test(
        'getAccountInfo(): Get ID information',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();

            // get by account name
            let userInfo = await User.getAccountInfo(await user.storage.accountName);

            expect(userInfo.account_name).toEqual(await user.storage.accountName);

            // get by username
            userInfo = await User.getAccountInfo(await user.storage.username);

            expect(userInfo.account_name).toEqual(await user.storage.accountName);

            // Close connections
            await user.logout();
        })
    );
    test(
        'login() fails with userName does not exists',
        catchAndPrintErrors(async () => {
            const { user, password } = await createRandomID();

            const username = await user.storage.username;

            const newKeyManager = new JsKeyManager();
            const userLogin = createUserObject(newKeyManager, jsStorageFactory);

            expect(userLogin.isLoggedIn()).resolves.toBeFalsy();

            await expect(userLogin.login(new TonomyUsername('random'), password)).rejects.toThrowError(Error);
            // Close connections
            await userLogin.logout();
            await user.logout();
        })
    );
});
