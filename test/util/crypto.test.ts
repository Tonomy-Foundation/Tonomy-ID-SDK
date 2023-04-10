import { sha256, randomString } from '../../src/sdk/util/crypto';

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
