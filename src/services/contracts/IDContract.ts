/* eslint-disable camelcase */

import { API, Checksum256, Name } from '@greymass/eosio';
import { sha256 } from '../../util/crypto';
import { getApi } from '../eosio/eosio';
import { Signer, transact } from '../eosio/transaction';
import { throwExpectedError, throwUnexpectedError } from '../errors';

enum PermissionLevel {
    OWNER = 'OWNER',
    ACTIVE = 'ACTIVE',
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    FINGERPRINT = 'FINGERPRINT',
    LOCAL = 'LOCAL',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace PermissionLevel {
    /*
     * Returns the index of the enum value
     *
     * @param value The value to get the index of
     */
    export function indexFor(value: PermissionLevel): number {
        return Object.keys(PermissionLevel).indexOf(value);
    }

    /*
     * Creates an PermissionLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): PermissionLevel {
        let index: number;
        if (typeof value !== 'number') {
            index = PermissionLevel.indexFor(value as PermissionLevel);
        } else {
            index = value;
        }
        return Object.values(PermissionLevel)[index] as PermissionLevel;
    }
}

type GetAccountTonomyIDInfoResponse = {
    account_name: Name;
    type: number;
    status: number;
    username_hash: Checksum256;
    password_salt: Checksum256;
    version: number;
};

class IDContract {
    static _singleton_instance: IDContract;

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this());
    }

    async newperson(
        username_hash: string,
        password_key: string,
        password_salt: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: 'id.tonomy',
                    permission: 'active',
                },
            ],
            account: 'id.tonomy',
            name: 'newperson',
            data: {
                username_hash,
                password_key,
                password_salt,
            },
        };

        return await transact(Name.from('id.tonomy'), [action], signer);
    }

    async updatekeys(
        account: string,
        keys: {
            FINGERPRINT?: string;
            PIN?: string;
            LOCAL?: string;
        },
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [];
        if (Object.keys(keys).length === 0) throwUnexpectedError('TSDK1100', 'At least one key must be provided');

        for (const key in keys) {
            const permission = PermissionLevel.from(key);

            // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
            const publicKey = (keys as any)[key];

            actions.push({
                authorization: [
                    {
                        actor: account,
                        permission: 'owner',
                    },
                ],
                account: 'id.tonomy',
                name: 'updatekey',
                data: {
                    account,
                    permission: PermissionLevel.indexFor(permission),
                    key: publicKey,
                },
            });
        }

        return await transact(Name.from('id.tonomy'), actions, signer);
    }

    async getAccountTonomyIDInfo(account: string | Name): Promise<GetAccountTonomyIDInfoResponse> {
        let data;
        const api = await getApi();
        if (typeof account === 'string') {
            // this is a username
            const usernameHash = Checksum256.from(sha256(account));

            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'accounts',
                // eslint-disable-next-line camelcase
                lower_bound: usernameHash,
                limit: 1,
                // eslint-disable-next-line camelcase
                index_position: 'secondary',
            });
            if (!data || !data.rows) throwUnexpectedError('No data found', 'TSDK1104');
            if (data.rows.length === 0 || data.rows[0].username_hash !== usernameHash.toString()) {
                throwExpectedError('Account with username "' + account + '" not found', 'TSDK1101');
            }
        } else {
            // use the account name directly
            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'accounts',
                // eslint-disable-next-line camelcase
                lower_bound: account,
                limit: 1,
            });
            if (!data || !data.rows) throwUnexpectedError('No data found', 'TSDK1102');
            if (data.rows.length === 0 || data.rows[0].account_name !== account.toString()) {
                throwExpectedError('TSDK1103', 'Account "' + account.toString() + '" not found');
            }
        }

        const idData = data.rows[0];
        return {
            account_name: Name.from(idData.account_name),
            type: idData.type,
            status: idData.status,
            username_hash: Checksum256.from(idData.username_hash),
            password_salt: Checksum256.from(idData.password_salt),
            version: idData.version,
        };
    }
}

export { IDContract, GetAccountTonomyIDInfoResponse };
