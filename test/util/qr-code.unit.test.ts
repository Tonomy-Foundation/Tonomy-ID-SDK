import { SdkErrors } from '../../src/sdk';
import { createLoginQrCode, validateQrCode } from '../../src/sdk/util/qr-code';
import { settings } from '../helpers/settings';

const tonomyIdSchema = settings.tonomyIdSchema;

describe('createLoginQrCode()', () => {
    const did = 'antelope:example:1234';

    it('creates a valid QR code', () => {
        expect(createLoginQrCode(did)).toEqual(tonomyIdSchema + 'ScanQR?did=' + did);
    });
});

describe('validateQrCode()', () => {
    const did = 'antelope:example:1234';

    it('validates a valid QR code', () => {
        const qrCode = createLoginQrCode(did);

        expect(validateQrCode(qrCode)).toEqual(did);
    });

    it('throws an error if the QR code is has different schema', () => {
        const qrCode = 'tonomyid2://ScanQR?did=antelope:example:1234';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is has different path', () => {
        const qrCode = 'tonomyid://ScanQR?did=antelope:example:1234';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is empty', () => {
        const qrCode = '';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code is has no query', () => {
        const qrCode = 'tonomyid://ScanQR';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });

    it('throws an error if the QR code has empty DID', () => {
        const qrCode = 'tonomyid://ScanQR?did=';

        expect(() => validateQrCode(qrCode)).toThrowError(SdkErrors.InvalidQrCode);
    });
});
