import { createRandomID } from '../helpers/user';
import { KeyManager, KeyManagerLevel, TonomyUsername, User, createUserObject, EosioUtil } from '../../src/sdk/index';
import { SdkErrors } from '../../src/sdk/index';
import { JsKeyManager } from '../../src/sdk/storage/jsKeyManager';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { Checksum256 } from '@wharfkit/antelope';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { getAccount } from '../../src/sdk/services/blockchain/eosio/eosio';
import { setTestSettings } from '../helpers/settings';

setTestSettings();

let auth: KeyManager;
let user: User;

describe('User class', () => {
    beforeEach((): void => {
        jest.setTimeout(60000);
        auth = new JsKeyManager();
        user = createUserObject(auth, jsStorageFactory);
    });

    afterEach(async () => {
        await user.logout();
    });

    test('savePassword() generates and saves new private key', async () => {
        expect(user.savePassword).toBeDefined();

        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).rejects.toThrowError(Error);
        expect(await user.storage.salt).not.toBeDefined();
        await user.savePassword('n4RR8mj!cC$VaG907bq4', { keyFromPasswordFn: generatePrivateKeyFromPassword });
        expect(user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).resolves.toBeDefined();
        expect(await user.storage.salt).toBeDefined();
    });

    test('savePassphrase() generates and saves new private key', async () => {
        expect(user.savePassphrase).toBeDefined();

        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).rejects.toThrowError(Error);
        expect(await user.storage.salt).not.toBeDefined();
        await user.savePassword('absurd aunt author love sport sun', {
            keyFromPasswordFn: generatePrivateKeyFromPassword,
        });
        expect(user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).resolves.toBeDefined();
    });

    test('savePIN() saves new private key', async () => {
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PIN })).rejects.toThrowError(Error);
        await user.savePIN('4568');
        expect(user.keyManager.getKey({ level: KeyManagerLevel.PIN })).resolves.toBeDefined();
    });

    test('saveFingerprint() saves new private key', async () => {
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC })).rejects.toThrowError(Error);
        await user.saveFingerprint();
        expect(user.keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC })).resolves.toBeDefined();
    });

    test('saveLocal() saves new private key', async () => {
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).rejects.toThrowError(Error);
        await user.saveLocal();
        expect(user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).resolves.toBeDefined();
    });

    test('createPerson(): Create a new ID of a person', async () => {
        const { user } = await createRandomID();

        const accountName = await user.storage.accountName;

        const accountInfo = await getAccount(accountName);

        expect(accountInfo).toBeDefined();
        expect(accountInfo.account_name.toString()).toBe(accountName.toString());

        // Password key
        expect(accountInfo.getPermission('owner').required_auth.threshold.toNumber()).toBe(1);
        expect(accountInfo.getPermission('owner').required_auth.keys[0].key).toBeDefined();

        // PIN key
        expect(accountInfo.getPermission('pin').parent.toString()).toBe('owner');
        expect(accountInfo.getPermission('pin').required_auth.threshold.toNumber()).toBe(1);
        expect(accountInfo.getPermission('pin').required_auth.keys[0].key).toBeDefined();

        // Biometric key
        expect(accountInfo.getPermission('biometric').parent.toString()).toBe('owner');
        expect(accountInfo.getPermission('biometric').required_auth.threshold.toNumber()).toBe(1);
        expect(accountInfo.getPermission('biometric').required_auth.keys[0].key).toBeDefined();

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
    });

    test('login() logs in with password', async () => {
        const { user, password } = await createRandomID();

        const username = await user.getUsername();

        const newKeyManager = new JsKeyManager();
        const userLogin = createUserObject(newKeyManager, jsStorageFactory);

        expect(userLogin.isLoggedIn()).resolves.toBeFalsy();
        const idInfo = await userLogin.login(username, password, {
            keyFromPasswordFn: generatePrivateKeyFromPassword,
        });

        expect(idInfo.username_hash.toString()).toBe(username.usernameHash);
        expect(userLogin.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).resolves.toBeDefined();
        expect(await userLogin.storage.accountName).toBeDefined();
        expect((await userLogin.getUsername()).username).toBe(username.username);
        expect(userLogin.isLoggedIn()).toBeTruthy();

        // Close connections
        await user.logout();
        await userLogin.logout();
    });

    test('login() fails with wrong password', async () => {
        const { user } = await createRandomID();

        const username = await user.getUsername();

        const newKeyManager = new JsKeyManager();
        const userLogin = createUserObject(newKeyManager, jsStorageFactory);

        await expect(() =>
            userLogin.login(username, 'differentpassword', { keyFromPasswordFn: generatePrivateKeyFromPassword })
        ).rejects.toThrowError(Error);

        // Close connections
        await user.logout();
        await userLogin.logout();
    });

    test('checkKeysStillValid() keys are still valid after create account', async () => {
        const { user } = await createRandomID();

        await expect(user.checkKeysStillValid()).resolves.toBeTruthy();

        // Close connections
        await user.logout();
    });

    test('checkKeysStillValid() keys are still valid after create account and login again', async () => {
        const { user, password } = await createRandomID();

        await user.savePIN('1234');
        await user.saveLocal();
        await user.updateKeys(password);

        await expect(user.checkKeysStillValid()).resolves.toBeTruthy();

        // Close connections
        await user.logout();
    });

    test('checkKeysStillValid() keys are not valid after login and change keys but not update yet', async () => {
        const { user } = await createRandomID();

        // Emulate that user updates their keys, but not the blockchain yet
        await user.saveLocal();
        await user.savePIN('1234');

        await expect(user.checkKeysStillValid()).rejects.toThrowError(SdkErrors.KeyNotFound);

        // Close connections
        // TODO if expect fails, then the user.logout() is not called and we dont cleanup. We need to fix this
        await user.logout();
    });

    test("checkKeysStillValid() throws error if user doesn't exist", async () => {
        await expect(user.checkKeysStillValid()).rejects.toThrowError(SdkErrors.AccountDoesntExist);
    });

    test("checkPassword() throws error if password doesn't match", async () => {
        const { user, password } = await createRandomID();

        await user.login(await user.getUsername(), password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

        await expect(
            user.checkPassword('Testing123!@', { keyFromPasswordFn: generatePrivateKeyFromPassword })
        ).rejects.toThrowError(SdkErrors.PasswordInvalid);
        await expect(
            user.checkPassword('password', { keyFromPasswordFn: generatePrivateKeyFromPassword })
        ).rejects.toThrowError(SdkErrors.PasswordFormatInvalid);

        await user.logout();
    });

    test('checkPassword() returns true when password matches', async () => {
        const { user, password } = await createRandomID();

        await user.login(await user.getUsername(), password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

        await expect(user.checkPassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword })).resolves.toBe(
            true
        );

        await user.logout();
    });

    test('logout', async () => {
        const { user } = await createRandomID();

        await user.logout();

        expect(await user.storage.status).toBeFalsy();
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PASSWORD })).rejects.toThrowError(Error);
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.PIN })).rejects.toThrowError(Error);
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC })).rejects.toThrowError(Error);
        expect(() => user.keyManager.getKey({ level: KeyManagerLevel.LOCAL })).rejects.toThrowError(Error);
        expect(user.isLoggedIn()).resolves.toBeFalsy();

        // Close connections
        await user.logout();
    });

    test('getAccountInfo(): Get ID information', async () => {
        const { user } = await createRandomID();

        // get by account name
        let userInfo = await User.getAccountInfo(await user.getAccountName());

        expect(userInfo.account_name).toEqual(await user.getAccountName());

        // get by username
        userInfo = await User.getAccountInfo(await user.getUsername());

        expect(userInfo.account_name).toEqual(await user.getAccountName());

        // Close connections
        await user.logout();
    });

    test('login() fails with userName does not exists', async () => {
        const { user, password } = await createRandomID();

        const newKeyManager = new JsKeyManager();
        const userLogin = createUserObject(newKeyManager, jsStorageFactory);

        expect(userLogin.isLoggedIn()).resolves.toBeFalsy();

        await expect(
            userLogin.login(new TonomyUsername('random'), password, {
                keyFromPasswordFn: generatePrivateKeyFromPassword,
            })
        ).rejects.toThrowError(Error);
        // Close connections
        await userLogin.logout();
        await user.logout();
    });
    test('getDid() expect chainId and account name defined', async () => {
        const { user } = await createRandomID();
        const accountName = await user.storage.accountName;
        const chainId = (await EosioUtil.getChainInfo()).chain_id as unknown as Checksum256;

        expect(chainId).toBeDefined();
        expect(accountName).toBeDefined();
        expect(await user.getDid()).toEqual(`did:antelope:${chainId}:${accountName.toString()}`);
        await user.logout();
    });

    test('intializeFromStorage() return true if account exists', async () => {
        const { user } = await createRandomID();
        const accountName = await user.storage.accountName;

        expect(accountName).toBeDefined();
        await expect(user.intializeFromStorage()).resolves.toBeTruthy();

        await user.logout();
    });

    test("intializeFromStorage() throws error if storage doesn't exist", async () => {
        await expect(user.intializeFromStorage()).rejects.toThrowError(SdkErrors.AccountDoesntExist);
    });

    test('CheckPin() returns true when pin matches', async () => {
        const { user, password } = await createRandomID();

        await user.login(await user.getUsername(), password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

        await user.savePIN('12345');
        await expect(user.keyManager.getKey({ level: KeyManagerLevel.PIN })).resolves.toBeDefined();

        await expect(user.checkPin('12345')).resolves.toBe(true);

        await user.logout();
    });

    test('CheckPin() throws error if the Key Does not matches', async () => {
        const { user, password } = await createRandomID();

        await user.login(await user.getUsername(), password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

        await user.savePIN('12345');
        await expect(user.keyManager.getKey({ level: KeyManagerLevel.PIN })).resolves.toBeDefined();
        await expect(user.checkPin('12121')).rejects.toThrowError(SdkErrors.PinInvalid);

        await user.logout();
    });

    test('usernameExists(), returns true if username already exists if not throws an error', async () => {
        const { user, username } = await createRandomID();

        await expect(user.usernameExists(username)).resolves.toBe(true);

        await expect(user.usernameExists('RandomUsername')).resolves.toBe(false);

        await user.logout();
    });

    test('Create an account, logs out and logs back in, while skipping PIN and Biometric', async () => {
        const { user, password } = await createRandomID(false);
        const key1 = await user.keyManager.getKey({ level: KeyManagerLevel.LOCAL });
        const username1 = await user.getUsername();

        await user.logout();
        await user.login(username1, password, { keyFromPasswordFn: generatePrivateKeyFromPassword });
        await user.saveLocal();
        const key2 = await user.keyManager.getKey({ level: KeyManagerLevel.LOCAL });

        expect(key1.toString()).not.toEqual(key2.toString());
        await user.updateKeys(password);
        await user.logout();
    });
});
