import { Checksum256, PrivateKey } from '@greymass/eosio';
import { JsKeyManager } from './jskeymanager';
import argon2 from 'argon2';
import { jsStorageFactory } from './jsstorage';
import { createUserObject } from '../../src/user';
import { KeyManagerLevel } from '../../src/services/keymanager';
import { randomBytes } from '../../src/util/crypto';
import { setSettings } from '../../src';

const keyManager = new JsKeyManager();

setSettings({});
const user = createUserObject(keyManager, jsStorageFactory);

describe('Keymanager class', () => {
    test('KeyManagerLevel enum helpers', () => {
        const passwordLevel = KeyManagerLevel.PASSWORD;

        expect(passwordLevel).toBe('PASSWORD');
        expect(KeyManagerLevel.indexFor(passwordLevel)).toBe(0);
        expect(KeyManagerLevel.from('PASSWORD')).toBe(passwordLevel);
    });

    test('savePassword() is defined', () => {
        expect(user.savePassword).toBeDefined();
    });

    test('generatePrivateKeyFromPassword() returns privatekey', async () => {
        const password = '123';
        const { privateKey, salt } = await keyManager.generatePrivateKeyFromPassword(password);

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(salt).toBeDefined();
    });

    test('time hashing in generatePrivateKeyFromPassword() function', async () => {
        const password = '123';
        const salt = Checksum256.from(randomBytes(32));
        const options = {
            salt: Buffer.from(salt.hexString, 'hex'),
            hashLength: 32,
            type: argon2.argon2id,
            raw: true,
            memoryCost: 16384,
            parallelism: 1,
        };

        async function timeArgon2(options: any): Promise<number> {
            const start = new Date();

            await argon2.hash(password, options);
            const finish = new Date();

            return finish.getTime() - start.getTime();
        }

        const time0 = await timeArgon2(options);
        const time1 = await timeArgon2({ ...options, ...{ type: argon2.argon2d } });
        const time2 = await timeArgon2({ ...options, ...{ type: argon2.argon2i } });
        const time3 = await timeArgon2({ ...options, ...{ memoryCost: 16384 * 10 } });
        const time3a = await timeArgon2({ ...options, ...{ memoryCost: 16384 * 4 } });
        const time4 = await timeArgon2({ ...options, ...{ parallelism: 10 } });
        const time5 = await timeArgon2({
            ...options,
            ...{ salt: Buffer.from(randomBytes(32 * 10)), hashLength: 32 * 10 },
        });

        console.log(`generatePrivateKeyFromPassword() took time:\n
                     time0: ${time0}ms\n
                     time1: ${time1}ms\n
                     time2: ${time2}ms\n
                     time3: ${time3}ms\n
                     time3a: ${time3a}ms\n
                     time4: ${time4}ms\n
                     time5: ${time5}ms`);
    });

    test('generatePrivateKeyFromPassword() password can be verfied', async () => {
        const password = '123';
        const { privateKey, salt } = await keyManager.generatePrivateKeyFromPassword(password);

        const { privateKey: privateKey2 } = await keyManager.generatePrivateKeyFromPassword(password, salt);

        expect(privateKey).toEqual(privateKey2);
    });

    test('generateRandomPrivateKey() is defined', () => {
        expect(keyManager.generateRandomPrivateKey).toBeDefined();
    });

    test('generateRandomPrivateKey() generates random key', async () => {
        const r1 = keyManager.generateRandomPrivateKey();

        expect(r1).toBeInstanceOf(PrivateKey);

        const r2 = keyManager.generateRandomPrivateKey();

        expect(r1).not.toEqual(r2);
    });

    test('generates same key as RN keymanager', async () => {
        const salt: Checksum256 = Checksum256.from(Buffer.from('12345678901234567890123456789012', 'utf-8'));
        const { privateKey } = await keyManager.generatePrivateKeyFromPassword('password', salt);

        expect(privateKey.toString()).toBe('PVT_K1_pPnFBQwMSQgjAenyLdMHoeFQBtazFBYEWeA12FtKpm5PEY4fc');
    });
});
