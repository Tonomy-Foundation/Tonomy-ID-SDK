import { b64ToUtf8, base64UrlToStr, bnToBase64Url, strToBase64Url, utf8ToB64 } from '../../src/sdk';
import { BN } from 'bn.js';

describe('Base 64()', () => {
    it('bnToBase64Url()', () => {
        {
            // Good BN that does NOT cause error from no padding on the hex value
            const bn = new BN('100968908336250941489582664670319762383316987426946165788206218268821633081179');
            const base64 = bnToBase64Url(bn as any);

            expect(base64).toBe('3zpgfkpIN/0k/xkychS26ElYP4Bnb24RcYACzsbzn1s=');
        }

        {
            // Bad BN that DOES cause error from no padding on the hex value
            const bn = new BN('1881146970754576322752261068397796891246589699629597037555588131642783231506');
            const base64 = bnToBase64Url(bn as any);

            expect(base64).toBe('BCixAySH6XqSNMR6MVnd4SCluKq3Ey5RQIy0/0Eu7hI=');
        }
    });

    const str = 'hello world';
    const b64 = 'aGVsbG8gd29ybGQ=';
    const b64url = 'aGVsbG8gd29ybGQ';

    it('strToBase64Url()', () => {
        const base64url = strToBase64Url(str);
        const base64 = utf8ToB64(str);

        expect(base64url).toBe(b64url);
        expect(base64).toBe(b64);
    });

    it('base64UrlToStr()', () => {
        const decodedStr1 = b64ToUtf8(b64);
        const decodedStr2 = base64UrlToStr(b64url);

        expect(decodedStr1).toBe(str);
        expect(decodedStr2).toBe(str);
    });
});
