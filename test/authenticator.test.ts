
import { AuthenticatorLevel } from '../src/index';

describe('Authenticator class', () => {

    test('AuthenticatorLevel enum helpers', () => {
        const passwordLevel = AuthenticatorLevel.PASSWORD;
        expect(passwordLevel).toBe('PASSWORD');
        expect(AuthenticatorLevel.indexFor(passwordLevel)).toBe(0);
        expect(AuthenticatorLevel.from('PASSWORD')).toBe(passwordLevel);
    });
});