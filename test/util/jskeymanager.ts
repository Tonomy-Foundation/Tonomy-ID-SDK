import { KeyManager, KeyManagerLevel, KeyStorage, StoreKeyOptions, SignDataOptions, GetKeyOptions } from '../../src/keymanager';

import { sha256, randomString, randomBytes } from '../../src/util/crypto';
import argon2 from 'argon2';


import { Bytes, Checksum256, KeyType, PrivateKey, PublicKey, Signature } from '@greymass/eosio';
export default class JsKeyManager implements KeyManager {
  // TODO: use localStorage or sessionStorage in browser if available instead of keyStorage
  keyStorage: {
    [key in KeyManagerLevel]: KeyStorage;
  }
  // Creates a cryptographically secure Private key
  generateRandomPrivateKey(): PrivateKey {
    const randomString = randomBytes(32);
    return new PrivateKey(KeyType.K1, new Bytes(randomString));
  };

  async generatePrivateKeyFromPassword(password: string): Promise<{ privateKey: PrivateKey, salt: Buffer }> {
    // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
    const salt = randomBytes(32);

    const hash = await argon2.hash(password, { salt });
    const newBytes = Buffer.from(hash)
    const privateKey = new PrivateKey(KeyType.K1, new Bytes(newBytes));

    return {
      privateKey,
      salt
    }
  }


  // creates a new secure key and returns the public key
  async storeKey(options: StoreKeyOptions): Promise<PublicKey> {
    const keyStore: KeyStorage = {
      privateKey: options.privateKey,
      publicKey: options.privateKey.toPublic()
    }

    if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
      if (!options.challenge) throw new Error("Challenge missing");

      keyStore.salt = randomString(32);
      keyStore.hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);
    }

    this.keyStorage[options.level] = keyStore;
    return keyStore.publicKey;
  }

  async signData(options: SignDataOptions): Promise<string | Signature> {
    if (options.level in this.keyStorage) throw new Error("No key for this level");

    const keyStore = this.keyStorage[options.level];

    if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
      if (!options.challenge) throw new Error("Challenge missing");

      const hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);

      if (keyStore.hashedSaltedChallenge !== hashedSaltedChallenge) throw new Error("Challenge does not match");
    }

    const privateKey = keyStore.privateKey;
    const hash = Checksum256.hash(options.data);
    const signature = privateKey.signDigest(hash)

    return signature;
  }

  getKey(options: GetKeyOptions): PublicKey {
    if (options.level in this.keyStorage) throw new Error("No key for this level");

    const keyStore = this.keyStorage[options.level];
    return keyStore.publicKey;
  }
}