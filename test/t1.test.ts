
import { PrivateKey } from '@greymass/eosio';
import { User, JsAuthenticator } from '../src/index';
// import * as argon2 from "argon2";


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
    const { privateKey } = await user.generatePrivateKeyFromPassword('123');
    console.log(privateKey.data)
    // console.log(privateKey.sharedSecret(privateKey.toPublic()))
    // const result = argon2.verify(privateKey.toString(), '123', { salt })
    // expect(result).toBe(true);
  })

  test('function is defined', () => {
    expect(user.generateRandoPrivateKey).toBeDefined();
  })



})

