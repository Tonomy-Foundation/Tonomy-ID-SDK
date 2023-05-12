import { Checksum256, PrivateKey } from '@greymass/eosio';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { sha256, randomString, generateRandomKeyPair, randomBytes, toElliptic } from '../../src/sdk/util/crypto';
import * as argon2 from 'argon2';

describe('crypto sha256()', () => {
    it('sha256 hash', () => {
        expect(sha256('jack')).toEqual('31611159e7e6ff7843ea4627745e89225fc866621cfcfdbd40871af4413747cc');
    });
});

describe('crypto randomString()', () => {
    it('randomString creates a random string', () => {
        expect(randomString(32)).toHaveLength(64);
    });
});

describe('crypto generateRandomKeyPair()', () => {
    it('generateRandomKeyPair() creates a random keypair', () => {
        const key1 = generateRandomKeyPair();
        const key2 = generateRandomKeyPair();

        expect(key1.privateKey.toString()).not.toEqual(key2.privateKey.toString());
        expect(key1.publicKey.toString()).not.toEqual(key2.publicKey.toString());
    });

    it('uses generateRandomKeyPair() to create 100 valid EC Points', () => {
        expect.assertions(200);

        for (let i = 0; i < 100; i++) {
            const { publicKey } = generateRandomKeyPair();

            const ecKey = toElliptic(publicKey);
            const pubKey = ecKey.getPublic();

            expect(pubKey.getX().toString('hex').length).toBe(64);
            expect(pubKey.getY().toString('hex').length).toBe(64);
        }
    });
});

describe('crypto generatePrivateKeyFromPassword()', () => {
    it('can generate a private key from a password', async () => {
        const { privateKey, salt } = await generatePrivateKeyFromPassword('test');

        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(salt).toBeInstanceOf(Checksum256);
    });

    it('generates same private key from same salt', async () => {
        const salt = randomBytes(32);
        const hash = await generatePrivateKeyFromPassword('test', Checksum256.from(salt));
        const hash2 = await generatePrivateKeyFromPassword('test', Checksum256.from(salt));

        expect(hash2).toEqual(hash);
    });

    it('generatePrivateKeyFromPassword() creates the same private key from a password and salt as what happens in Tonomy ID', async () => {
        // See equivalent test in RNKeyManager.ts in Tonomy ID
        const password = 'testpassword';
        const saltInput = Checksum256.from(sha256('testsalt'));

        const { privateKey, salt } = await generatePrivateKeyFromPassword(password, saltInput);

        expect(salt.toString()).toBe('4edf07edc95b2fdcbcaf2378fd12d8ac212c2aa6e326c59c3e629be3039d6432');
        expect(privateKey.toString()).toEqual('PVT_K1_NXkZkJyhrPzSCpfe2uXbaw8xcKH95e9Gw5LdhkrzMSJwoZL6x');
    });

    it('argon2 generates the same value as with https://argon2.online', async () => {
        const password = 'testpassword';
        const saltInput = Checksum256.from(sha256('testsalt'));
        // 4edf07edc95b2fdcbcaf2378fd12d8ac212c2aa6e326c59c3e629be3039d6432

        const hash = await argon2.hash(password, {
            salt: Buffer.from(saltInput.hexString),
            type: argon2.argon2id,
            raw: true,
            timeCost: 3,
            memoryCost: 16384,
            parallelism: 1,
            hashLength: 32,
        });

        expect(hash.toString('hex')).toEqual('30e30e19f23a98bdb2e932d8c0e40ca4471cc02bb39cc4b508afe30921b44573');
    });

    test('time hashing in generatePrivateKeyFromPassword() function', async () => {
        const password = '123';
        const salt = Checksum256.from(randomBytes(32));
        const options = {
            salt: Buffer.from(salt.hexString),
            type: argon2.argon2id,
            raw: true,
            timeCost: 3,
            memoryCost: 16384,
            parallelism: 1,
            hashLength: 32,
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

    test('password can be verfied', async () => {
        const password = '123';
        const { privateKey, salt } = await generatePrivateKeyFromPassword(password);

        const { privateKey: privateKey2 } = await generatePrivateKeyFromPassword(password, salt);

        expect(privateKey).toEqual(privateKey2);
    });
});

describe('crypto randomBytes()', () => {
    it('randomBytes() creates a unique bytes', () => {
        expect(randomBytes(32)).not.toEqual(randomBytes(32));
    });
});
