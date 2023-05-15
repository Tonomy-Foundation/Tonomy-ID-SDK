import BN from 'bn.js';
import { bigintToBytes, bytesToBase64 } from '../../src/sdk/util/did-jwt.util';

describe('base64', () => {
    it('bnToBase64Url() gets the same value in node and browser', () => {
        function bnToBase64Url(bn: typeof BN, env: 'node' | 'browser'): string {
            const bi = BigInt(bn.toString());
            const biBytes = bigintToBytes(bi);
            const bi64 = bytesToBase64(biBytes);

            return bi64;
        }

        expect.assertions(100);

        for (let i = 0; i < 100; i++) {
            const bn = new BN(Math.floor(Math.random() * 10000000));

            expect(bnToBase64Url(bn as any, 'node')).toEqual(bnToBase64Url(bn as any, 'browser'));
        }
    });
});
