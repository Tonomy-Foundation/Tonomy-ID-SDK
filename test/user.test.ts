
import { PrivateKey } from '@greymass/eosio';
import { User, JsAuthenticator } from '../src/index';
import * as argon2 from "argon2";


describe('saving a password', () => {
  const auth = new JsAuthenticator();
  const user = new User(auth);

  test('function savePassword is defined', () => {

    expect(user.savePassword).toBeDefined();
  });

  test('generate private key returns privatekey', async () => {

    const { privateKey } = await user.generatePrivateKeyFromPassword('123')

    expect(privateKey).toBeInstanceOf(PrivateKey);
  })


  test('password can be verfied', async () => {
    const password = '123'
    const { privateKey, salt } = await user.generatePrivateKeyFromPassword(password);
    const data = Buffer.from(privateKey.data.array).toString('utf-8');
    const result = await argon2.verify(data, password, { salt })
    expect(result).toBe(true);
  })

  test('function is defined', () => {
    expect(user.generateRandoPrivateKey).toBeDefined();
  })



})

