import { NameType, Bytes, KeyType, PrivateKey, PublicKeyType, Checksum256 } from '@wharfkit/antelope';
import argon2 from 'argon2';
import { randomBytes } from '../../sdk/util/crypto';
import { EosioUtil, EosioContract } from '../../sdk';
import { Authority } from '../../sdk/services/blockchain/eosio/authority';
import { defaultAntelopePrivateKey } from '../../sdk/services/blockchain';

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
        timeCost: 40,
        memoryCost: 64 * 1024,
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

export const signer = EosioUtil.createSigner(defaultAntelopePrivateKey);

export async function updateAccountKey(account: NameType, newPublicKey: PublicKeyType, addCodePermission = false) {
    const authority = Authority.fromKey(newPublicKey.toString());

    if (addCodePermission) authority.addCodePermission(account.toString());

    await eosioContract.updateauth(account.toString(), 'active', 'owner', authority, signer);
    await eosioContract.updateauth(account.toString(), 'owner', 'owner', authority, signer);
}

/**
 * Updates the control by account, modifying the active and owner authorities.
 *
 * @param {NameType} account - The account to update.
 * @param {string} controllerAccount - The account name with controller permissions.
 * @param {boolean} [addCodePermission=false] - Whether to add code permission to the authorities. To add the eosio.code authority for smart contracts change this to [true]
 * @returns {Promise<void>} A Promise that resolves when the update is complete.
 */
export async function updateControllByAccount(account: NameType, controllerAccount: string, addCodePermission = false) {
    const ownerAuthority = Authority.fromAccount({ actor: controllerAccount, permission: 'owner' });
    const activeAuthority = Authority.fromAccount({ actor: controllerAccount, permission: 'active' });

    if (addCodePermission) ownerAuthority.addCodePermission(account.toString());
    if (addCodePermission) activeAuthority.addCodePermission(account.toString());

    await eosioContract.updateauth(account.toString(), 'active', 'owner', activeAuthority, signer);
    await eosioContract.updateauth(account.toString(), 'owner', 'owner', ownerAuthority, signer);
}
