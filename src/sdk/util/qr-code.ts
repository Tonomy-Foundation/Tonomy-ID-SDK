import { SdkErrors, throwError } from './errors';
import { getSettings } from './settings';

/**
 *
 * @param {string} qrCode - The QR code to validate
 * @returns {string} - the DID of the user if the QR code is valid
 *
 * @throws if QR code is invalid
 */
export function validateQrCode(qrCode: string): string {
    console.log('qrCode', qrCode);

    if (!qrCode) {
        throwError('QR code is empty', SdkErrors.InvalidQrCode);
    }

    const schema = getSettings().tonomyIdSchema;

    if (!qrCode.startsWith(schema)) {
        throwError('QR schema does not match app', SdkErrors.InvalidQrCode);
    }

    const path = qrCode.replace(schema, '').split('?')[0];
    const query = qrCode.replace(schema, '').split('?')[1];

    if (path !== 'UserHome') {
        throwError('QR path is not correct', SdkErrors.InvalidQrCode);
    }

    if (!query || query.indexOf('did=') === -1) {
        throwError('QR did param not found', SdkErrors.InvalidQrCode);
    }

    const did = query.split('did=')[1];

    if (!did) {
        throwError('QR did param is empty', SdkErrors.InvalidQrCode);
    }

    return did;
}

export function createLoginQrCode(did: string): string {
    const schema = getSettings().tonomyIdSchema;

    return schema + 'UserHome?did=' + did;
}
