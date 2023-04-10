import { Bytes, KeyType, PrivateKey, Checksum256 } from '@greymass/eosio';
import argon2 from 'argon2';
import { randomBytes } from '../../sdk/util/crypto';
import { EosioUtil } from '../../sdk';

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

const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
const publicKey = privateKey.toPublic();
// PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const signer = EosioUtil.createSigner(privateKey as any);

export { privateKey, publicKey, signer };
