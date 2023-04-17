import { sha256, randomString, generateRandomKeyPair, randomBytes } from '../../src/sdk/util/crypto';

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

describe('crypto randomBytes()', () => {
    it('randomBytes() creates a unique bytes', () => {
        expect(randomBytes(32)).not.toEqual(randomBytes(32));
    });
});
