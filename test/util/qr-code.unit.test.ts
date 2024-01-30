import { SdkErrors } from '../../src/sdk';
import { createLoginQrCode, validateQrCode } from '../../src/sdk/util/qr-code';
import { settings, setTestSettings } from '../helpers/settings';

setTestSettings();

const tonomyIdSchema = settings.tonomyIdSchema;

describe('createLoginQrCode()', () => {
    const did = 'antelope:example:1234';

    it('creates a valid QR code', () => {
        expect(createLoginQrCode(did)).toEqual(tonomyIdSchema + 'UserHome?did=' + did);
    });
});

describe('validateQrCode()', () => {
    const did = 'antelope:example:1234';

    it('validates a valid QR code', () => {
        const qrCode = createLoginQrCode(did);

        expect(validateQrCode(qrCode)).toEqual(did);
    });

    it('throws an error if the QR code is has different schema', () => {
        const qrCode = 'tonomyid2://UserHome?did=antelope:example:1234';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is has different path', () => {
        const qrCode = 'tonomyid://UserHome2?did=antelope:example:1234';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is empty', () => {
        const qrCode = '';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is has no query', () => {
        const qrCode = 'tonomyid://UserHome';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code has empty DID', () => {
        const qrCode = 'tonomyid://UserHome?did=';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });
});
