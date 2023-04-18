import { Checksum256, PrivateKey } from '@greymass/eosio';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { sha256, randomString, generateRandomKeyPair, randomBytes } from '../../src/sdk/util/crypto';
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
        const saltInput = Checksum256.from(sha256('testsalt'));

        const { privateKey, salt } = await generatePrivateKeyFromPassword('testpassword', saltInput);

        expect(salt.toString()).toBe('4edf07edc95b2fdcbcaf2378fd12d8ac212c2aa6e326c59c3e629be3039d6432');
        expect(privateKey.toString()).toEqual('PVT_K1_NXkZkJyhrPzSCpfe2uXbaw8xcKH95e9Gw5LdhkrzMSJwoZL6x');
    });

    it('argon2 generates the same value as with https://argon2.online', async () => {
        const password = 'testpassword';
        const saltInput = Checksum256.from(sha256('testsalt'));

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
});

describe('crypto randomBytes()', () => {
    it('randomBytes() creates a unique bytes', () => {
        expect(randomBytes(32)).not.toEqual(randomBytes(32));
    });
});
