import { SdkErrors } from '../../src/services/errors';
import { validatePassword } from '../../src/util/passwords';

describe('validatePassword()', () => {
    it('it succeeds with good password', () => {
        expect(() => validatePassword('k^3dTEqXfolCPo5^QhmD')).not.toThrow();
    });

    it('it fails with password <12 chars', () => {
        expect(() => validatePassword('')).toThrow(SdkErrors.PasswordFormatInvalid);
    });

    it('it fails without a-z', () => {
        expect(() => validatePassword('AABBAABB0011!!@@')).toThrow(SdkErrors.PasswordFormatInvalid);
    });

    it('it fails without A-Z', () => {
        expect(() => validatePassword('aabbaabb0011!!@@')).toThrow(SdkErrors.PasswordFormatInvalid);
    });

    it('it fails without 0-9', () => {
        expect(() => validatePassword('aabbAABBaabb!!@@')).toThrow(SdkErrors.PasswordFormatInvalid);
    });

    it('it fails with common password', () => {
        expect(() => validatePassword('aaPassword011!!@@')).toThrow(SdkErrors.PasswordTooCommon);
    });
});
