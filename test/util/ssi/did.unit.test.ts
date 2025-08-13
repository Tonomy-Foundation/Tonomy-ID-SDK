import { getAccountNameFromDid } from '../../../src/sdk/util/ssi/did';

describe('did', () => {
    it('parses a DID', async () => {
        expect(getAccountNameFromDid('did:antelope:1234').toString()).toBe('1234');
        expect(getAccountNameFromDid('did:antelope:1234#key-1').toString()).toBe('1234');
        expect(getAccountNameFromDid('did:antelope:eos:testnet:jungle:jack').toString()).toBe('jack');
        expect(
            getAccountNameFromDid(
                'did:antelope:aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906:jack#key-1'
            ).toString()
        ).toBe('jack');
    });
});
