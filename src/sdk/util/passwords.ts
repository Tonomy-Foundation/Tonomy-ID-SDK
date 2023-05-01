import { SdkErrors, throwError } from './errors';
import { top100Passwords } from './top100Passwords';

export function validatePassword(masterPassword: string): string {
    const normalizedPassword = masterPassword.normalize('NFKC');

    // minimum 12 characters
    // at least 1 lowercase, 1 uppercase, 1 number
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(normalizedPassword)) {
        throwError('Password is invalid', SdkErrors.PasswordFormatInvalid);
    }

    for (const password of top100Passwords) {
        if (normalizedPassword.toLowerCase().includes(password))
            throwError('Password contains words or phrases that are too common', SdkErrors.PasswordTooCommon);
    }

    return normalizedPassword;
}
