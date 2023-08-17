import { NameType, Bytes, KeyType, PrivateKey, PublicKeyType, Checksum256 } from '@wharfkit/antelope';
import argon2 from 'argon2';
import { randomBytes } from '../../sdk/util/crypto';
import { EosioUtil, EosioContract } from '../../sdk';
import { Authority } from '../../sdk/services/blockchain/eosio/authority';

const eosioContract = EosioContract.Instance;

/**
 * creates a key based on secure (hashing) key generation algorithm Argon2
 */
export async function generatePrivateKeyFromPassword(
    password: string,
    salt?: Checksum256
): Promise<{ privateKey: PrivateKey; salt: Checksum256 }> {
    if (!salt) salt = Checksum256.from(randomBytes(32));
    const hash = await argon2.hash(password, {
        salt: Buffer.from(salt.hexString),
        type: argon2.argon2id,
        raw: true,
        timeCost: 3,
        memoryCost: 16384,
        parallelism: 1,
        hashLength: 32,
    });

    const bytes = Bytes.from(hash);

    const privateKey = new PrivateKey(KeyType.K1, bytes);

    return {
        privateKey,
        salt,
    };
}

export const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
export const publicKey = privateKey.toPublic();
// PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signer = EosioUtil.createSigner(privateKey as any);

export async function updateAccountKey(account: NameType, newPublicKey: PublicKeyType, addCodePermission = false) {
    const authority = Authority.fromKey(newPublicKey.toString());

    if (addCodePermission) authority.addCodePermission(account.toString());

    await eosioContract.updateauth(account.toString(), 'active', 'owner', authority, signer);
    await eosioContract.updateauth(account.toString(), 'owner', 'owner', authority, signer);
}
