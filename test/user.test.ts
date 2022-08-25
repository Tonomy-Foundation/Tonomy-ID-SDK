
import { PrivateKey } from '@greymass/eosio';
import { User, JsAuthenticator } from '../src/index';
import * as argon2 from "argon2";

const auth = new JsAuthenticator();
const user = new User(auth);

describe('saving a password', () => {

  test('function savePassword is defined', () => {

    expect(user.savePassword).toBeDefined();
  });

  test('generate private key returns privatekey', async () => {

    const { privateKey, salt } = await user.generatePrivateKeyFromPassword('123')

    expect(privateKey).toBeInstanceOf(PrivateKey);
    expect(salt).toBeDefined();
  })

  test('password can be verfied', async () => {
    const password = '123'
    const { privateKey, salt } = await user.generatePrivateKeyFromPassword(password);
    const data = Buffer.from(privateKey.data.array).toString('utf-8');
    const result = await argon2.verify(data, password, { salt })
    expect(result).toBe(true);
  })
})


describe('generates random keys', () => {
  test('function generateRandomPrivateKey is defined', () => {
    expect(user.generateRandomPrivateKey).toBeDefined();
  })

  test('generate random key', async () => {
    const r1 = user.generateRandomPrivateKey();
    expect(r1).toBeInstanceOf(PrivateKey);

    const r2 = user.generateRandomPrivateKey();
    expect(r1).not.toEqual(r2);
  })
})

