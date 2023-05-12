import base64url from 'base64url';
import { hexToBase64 } from '../../src/sdk';
import BN from 'bn.js';
import { encode } from 'universal-base64url';

describe('base64', () => {
    it('bnToBase64Url() gets the same value in node and browser', () => {
        function bnToBase64Url(bn: typeof BN, env: 'node' | 'browser'): string {
            if (env === 'node') {
                // nodejs
                const buffer = (bn as any).toArrayLike(Buffer, 'be') as Buffer;

                const utf8 = buffer.toString('utf8');

                const old = buffer.toString('base64');
                const enc = encode(utf8);

                console.log(env, enc === old, 'enc === old', enc, old);
                return enc;
                // return Buffer.from(buffer).toString('base64');
            } else {
                // browser
                // ERROR???: BN.toString() will PAD with 0s!!!
                const old = hexToBase64((bn as any).toString('hex'));

                const byteArray = (bn as any).toArrayLike(Uint8Array, 'be') as Uint8Array;
                const utf8 = new TextDecoder().decode(byteArray);

                const enc = encode(utf8);

                console.log(env, enc === old, 'enc === old', enc, old);
            }
        }

        expect.assertions(100);

        for (let i = 0; i < 100; i++) {
            const bn = new BN(Math.floor(Math.random() * 10000000));

            expect(bnToBase64Url(bn as any, 'node')).toEqual(bnToBase64Url(bn as any, 'browser'));
        }
    });
});
