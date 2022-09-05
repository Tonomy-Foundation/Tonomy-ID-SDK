import { PrivateKey } from '@greymass/eosio';
import { User, JsAuthenticator, AuthenticatorLevel } from '../src/index';
import * as argon2 from "argon2";

let auth: JsAuthenticator;
let user: User;

describe('User class', () => {

  beforeEach(() => {
    auth = new JsAuthenticator();
    user = new User(auth);
  });

  test("savePassword()", async () => {
    expect(user.savePassword).toBeDefined();

    expect(() => user.authenticator.getKey({ level: AuthenticatorLevel.PASSWORD })).toThrowError(Error);
    expect(user.salt).not.toBeDefined();
    await user.savePassword("myPassword123!");
    expect(user.authenticator.getKey({ level: AuthenticatorLevel.PASSWORD })).toBeDefined();
  });

  test("savePIN()", async () => {
    expect(() => user.authenticator.getKey({ level: AuthenticatorLevel.PIN })).toThrowError(Error);
    await user.savePIN("4568");
    expect(user.authenticator.getKey({ level: AuthenticatorLevel.PIN })).toBeDefined();
  });

  test("saveFingerprint()", async () => {
    expect(() => user.authenticator.getKey({ level: AuthenticatorLevel.FINGERPRINT })).toThrowError(Error);
    await user.saveFingerprint();
    expect(user.authenticator.getKey({ level: AuthenticatorLevel.FINGERPRINT })).toBeDefined();
  });

  test("saveLocal()", async () => {
    expect(() => user.authenticator.getKey({ level: AuthenticatorLevel.LOCAL })).toThrowError(Error);
    await user.saveLocal();
    expect(user.authenticator.getKey({ level: AuthenticatorLevel.LOCAL })).toBeDefined();
  });

  test('generatePrivateKeyFromPassword() returns privatekey', async () => {
    const { privateKey, salt } = await user.generatePrivateKeyFromPassword('123')

    expect(privateKey).toBeInstanceOf(PrivateKey);
    expect(salt).toBeDefined();
  })

  test('generatePrivateKeyFromPassword() password can be verfied', async () => {
    const password = '123'
    const { privateKey, salt } = await user.generatePrivateKeyFromPassword(password);
    const data = Buffer.from(privateKey.data.array).toString('utf-8');
    const result = await argon2.verify(data, password, { salt })
    expect(result).toBe(true);
  })

  test('generateRandomPrivateKey()', () => {
    expect(user.generateRandomPrivateKey).toBeDefined();

    const r1 = user.generateRandomPrivateKey();
    expect(r1).toBeInstanceOf(PrivateKey);

    const r2 = user.generateRandomPrivateKey();
    expect(r1).not.toEqual(r2);
  })
})
