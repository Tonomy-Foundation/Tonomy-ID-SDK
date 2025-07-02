import { PrivateKey } from '@wharfkit/antelope';
import { JsKeyManager } from '../../src/sdk/storage/jsKeyManager';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import {
    CheckKeyOptions,
    GetKeyOptions,
    KeyManagerLevel,
    SignDataOptions,
    StoreKeyOptions,
} from '../../src/sdk/storage/keymanager';
import { generateRandomKeyPair, createVCSigner, createSigner } from '../../src/sdk/util/crypto';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { createTestUserObject, IUserPublic } from '../helpers/user';
import { resetTestDatabase, setupTestDatabase } from '../setup';

describe('Keymanager class', () => {
    let user: IUserPublic;

    beforeEach(async () => {
        const dataSource = await setupTestDatabase();

        user = createTestUserObject(new JsKeyManager(), jsStorageFactory, dataSource);
    });
    afterEach(async () => {
        await user.logout();
        await resetTestDatabase();
    });

    test('KeyManagerLevel enum helpers', () => {
        const passwordLevel = KeyManagerLevel.PASSWORD;

        expect(passwordLevel).toBe('PASSWORD');
        expect(KeyManagerLevel.indexFor(passwordLevel)).toBe(0);
        expect(KeyManagerLevel.from('PASSWORD')).toBe(passwordLevel);
    });

    test('savePassword() is defined', () => {
        expect(user.savePassword).toBeDefined();
    });

    test('generatePrivateKeyFromPassword() returns privateKey', async () => {
        const password = 'above day fever lemon piano sport';
        const { privateKey, salt } = await generatePrivateKeyFromPassword(password);

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(salt).toBeDefined();
    });

    test('generatePrivateKeyFromPassword() function Takes > 1s', async () => {
        const password = 'above day fever lemon piano sport';
        const startTime = new Date();

        await generatePrivateKeyFromPassword(password);
        const endTime = new Date();
        const executionTime = endTime.getTime() - startTime.getTime();

        expect(executionTime).toBeGreaterThan(1000);
    });

    test('generatePrivateKeyFromPassword() password can be verfied', async () => {
        const password = 'above day fever lemon piano sport';
        const { privateKey, salt } = await generatePrivateKeyFromPassword(password);

        const { privateKey: privateKey2 } = await generatePrivateKeyFromPassword(password, salt);

        expect(privateKey).toEqual(privateKey2);
    }, 10000);

    test('generateRandomKeyPair() generates random key', async () => {
        const r1 = generateRandomKeyPair().privateKey;

        expect(r1).toBeInstanceOf(PrivateKey);

        const r2 = generateRandomKeyPair().privateKey;

        expect(r1).not.toEqual(r2);
    });

    it('has same signer as antelopessi toolkit', async () => {
        const data = 'hi12asdasdasdsd3';

        const { privateKey } = generateRandomKeyPair();
        const keymanager = new JsKeyManager();

        keymanager.storeKey({ level: KeyManagerLevel.LOCAL, privateKey: privateKey });
        const signer = createVCSigner(keymanager, KeyManagerLevel.LOCAL).sign;
        const antelopeSigner = createSigner(privateKey as any);

        const signedWithTonomy = await signer(data);

        const signedWithAntelopeToolKit = await antelopeSigner(data);

        expect(signedWithTonomy).toBeTruthy();
        expect(signedWithAntelopeToolKit).toBeTruthy();
        expect(signedWithTonomy).toEqual(signedWithAntelopeToolKit);
    });

    it('validates KeyManagerLevel correctly', async () => {
        expect(() => KeyManagerLevel.validate(KeyManagerLevel.PASSWORD)).not.toThrow();
        expect(() => KeyManagerLevel.validate(KeyManagerLevel.ACTIVE)).not.toThrow();
        expect(() => KeyManagerLevel.validate('INVALID' as any)).toThrow();
        expect(() => KeyManagerLevel.validate(KeyManagerLevel.from('PASSWORD'))).not.toThrow();
        expect(() => KeyManagerLevel.validate(KeyManagerLevel.from('INVALID'))).toThrow();
    });

    it('validates arguments correctly', async () => {
        expect(() =>
            StoreKeyOptions.validate({ level: KeyManagerLevel.ACTIVE, privateKey: generateRandomKeyPair().privateKey })
        ).not.toThrow();
        expect(() =>
            StoreKeyOptions.validate({ level: 'INVALID' as any, privateKey: generateRandomKeyPair().privateKey })
        ).toThrow();
        expect(() => GetKeyOptions.validate({ level: KeyManagerLevel.ACTIVE })).not.toThrow();
        expect(() => CheckKeyOptions.validate({ level: KeyManagerLevel.ACTIVE, challenge: 'hi' })).not.toThrow();
        expect(() => CheckKeyOptions.validate({ level: KeyManagerLevel.ACTIVE, challenge: '' })).toThrow();
        expect(() => CheckKeyOptions.validate({ level: KeyManagerLevel.ACTIVE, challenge: 1 as any })).toThrow();
        expect(() => SignDataOptions.validate({ level: KeyManagerLevel.ACTIVE, data: 'hi' })).not.toThrow();
    });
});
