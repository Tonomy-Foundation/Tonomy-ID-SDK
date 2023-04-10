import { Bytes, KeyType, PrivateKey, Checksum256 } from '@greymass/eosio';
import argon2 from 'argon2';
import { randomBytes } from '../../src/sdk/util/crypto';

export async function generatePrivateKeyFromPassword(
    password: string,
    salt?: Checksum256
): Promise<{ privateKey: PrivateKey; salt: Checksum256 }> {
    // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
    if (!salt) salt = Checksum256.from(randomBytes(32));
    const hash = await argon2.hash(password, {
        salt: Buffer.from(salt.hexString, 'hex'),
        hashLength: 32,
        type: argon2.argon2id,
        raw: true,
        memoryCost: 16384,
        parallelism: 1,
    });
    const privateKey = new PrivateKey(KeyType.K1, new Bytes(hash));

    return {
        privateKey,
        salt,
    };
}
