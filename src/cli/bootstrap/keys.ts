import { NameType, Bytes, KeyType, PrivateKey, PublicKeyType, Checksum256 } from '@wharfkit/antelope';
import argon2 from 'argon2';
import { randomBytes } from '../../sdk/util/crypto';
import { EosioUtil } from '../../sdk';
import { Authority } from '../../sdk/services/blockchain/eosio/authority';
import { getEosioContract, getTonomyEosioProxyContract, Signer } from '../../sdk/services/blockchain';

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

export function getSigner(): Signer {
    return EosioUtil.createSigner(getDefaultAntelopePrivateKey());
}

export function getDefaultAntelopePrivateKey() {
    // This is the default private key used by an Antelope node when it is first started
    return PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
    // PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63
}

export function getDefaultAntelopePublicKey() {
    return getDefaultAntelopePrivateKey().toPublic();
}

export async function updateAccountKey(account: NameType, newPublicKey: PublicKeyType, addCodePermission = false) {
    const authority = Authority.fromKey(newPublicKey.toString());

    if (addCodePermission) authority.addCodePermission(account.toString());

    await getEosioContract().updateAuth(account.toString(), 'active', 'owner', authority, getSigner());
    await getEosioContract().updateAuth(account.toString(), 'owner', 'owner', authority, getSigner(), true);
}

/**
 * Updates the control by account, modifying the active and owner authorities.
 *
 * @param {NameType} account - The account name to update.
 * @param {string} controllerAccount - The account name(s) with controller permissions.
 * @param {boolean} [options.addCodePermission=false] - Whether to add code permission to the authorities. To add the eosio.code authority for smart contracts change this to [true]
 * @param {boolean} [options.replaceActive=true] - Whether to replace the active authority with the owner authority.
 * @param {boolean} [options.useTonomyContract=false] - Whether to use the tonomy eosio proxy contract instead of the eosio contract.
 * @returns {Promise<void>} A Promise that resolves when the update is complete.
 */
export async function updateControlByAccount(
    account: NameType,
    controllerAccount: string | string[],
    signer: Signer,
    options: { addCodePermission?: string | string[]; replaceActive?: boolean; useTonomyContract?: boolean } = {}
) {
    if (!Array.isArray(controllerAccount)) controllerAccount = [controllerAccount];
    const activeAuthority = Authority.fromAccount({ actor: controllerAccount[0], permission: 'active' });
    const ownerAuthority = Authority.fromAccount({ actor: controllerAccount[0], permission: 'owner' });

    if (options.addCodePermission) {
        if (Array.isArray(options.addCodePermission)) {
            for (const permission of options.addCodePermission) {
                activeAuthority.addCodePermission(permission);
                ownerAuthority.addCodePermission(permission);
            }
        } else {
            activeAuthority.addCodePermission(options.addCodePermission);
            ownerAuthority.addCodePermission(options.addCodePermission);
        }
    }

    // If multiple keys provided, make a 2/3 multisig
    if (controllerAccount.length > 1) {
        for (let i = 1; i < controllerAccount.length; i++) {
            activeAuthority.addAccount({ actor: controllerAccount[i], permission: 'active' });
            ownerAuthority.addAccount({ actor: controllerAccount[i], permission: 'owner' });
        }

        const threshold = Math.ceil((controllerAccount.length * 2) / 3);

        ownerAuthority.setThreshold(threshold);
        activeAuthority.setThreshold(threshold);
    }

    let contract = getEosioContract();

    if (options.useTonomyContract ?? false) {
        // @ts-expect-error contract does not have some of the functions of eosioContract type
        contract = getTonomyEosioProxyContract();
    }

    if (options.replaceActive ?? true) {
        await contract.updateAuth(account.toString(), 'active', 'owner', activeAuthority, signer);
    }

    await contract.updateAuth(account.toString(), 'owner', 'owner', ownerAuthority, signer, true);
}
