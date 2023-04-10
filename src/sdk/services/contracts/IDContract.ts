/* eslint-disable camelcase */
import { API, Checksum256, Name, PublicKey } from '@greymass/eosio';
import { TonomyUsername } from '../username';
import { getApi } from '../eosio/eosio';
import { Signer, transact } from '../eosio/transaction';
import { SdkErrors, throwError } from '../errors';
import { sha256 } from '../../util/crypto';

enum PermissionLevel {
    OWNER = 'OWNER',
    ACTIVE = 'ACTIVE',
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    BIOMETRIC = 'BIOMETRIC',
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

type GetPersonResponse = {
    account_name: Name;
    status: number;
    username_hash: Checksum256;
    password_salt: Checksum256;
    version: number;
};

type AppTableRecord = {
    account_name: Name;
    app_name: string;
    username_hash: Checksum256;
    description: string;
    logo_url: string;
    origin: string;
    version: number;
};

class IDContract {
    static singletonInstance: IDContract;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
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

    async updatekeysper(
        account: string,
        keys: {
            BIOMETRIC?: string;
            PIN?: string;
            LOCAL?: string;
        },
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [];

        if (Object.keys(keys).length === 0)
            throwError('At least one key must be provided', SdkErrors.UpdateKeysTransactionNoKeys);

        for (const key in keys) {
            const permission = PermissionLevel.from(key);

            // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
            const publicKey = (keys as any)[key];

            actions.push({
                authorization: [
                    {
                        actor: account,
                        permission: 'active',
                    },
                ],
                account: 'id.tonomy',
                name: 'updatekeyper',
                data: {
                    account,
                    permission: PermissionLevel.indexFor(permission),
                    key: publicKey,
                },
            });
        }

        return await transact(Name.from('id.tonomy'), actions, signer);
    }

    async newapp(
        app_name: string,
        description: string,
        username_hash: string,
        logo_url: string,
        origin: string,
        key: PublicKey,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        /^(((http:\/\/)|(https:\/\/))?)(([a-zA-Z0-9.])+)((:{1}[0-9]+)?)$/g.test(origin);
        /^(((http:\/\/)|(https:\/\/))?)(([a-zA-Z0-9.])+)((:{1}[0-9]+)?)([?#/a-zA-Z0-9.]*)$/g.test(logo_url);

        const action = {
            authorization: [
                {
                    actor: 'id.tonomy',
                    permission: 'active',
                },
            ],
            account: 'id.tonomy',
            name: 'newapp',
            data: {
                app_name,
                description,
                logo_url,
                origin: origin,
                username_hash,
                key,
            },
        };

        return await transact(Name.from('id.tonomy'), [action], signer);
    }

    async loginwithapp(
        account: string,
        app: string,
        parent: string,
        key: PublicKey,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: parent,
                },
            ],
            account: 'id.tonomy',
            name: 'loginwithapp',
            data: {
                account,
                app,
                parent,
                key,
            },
        };

        return await transact(Name.from('id.tonomy'), [action], signer);
    }

    async getPerson(account: TonomyUsername | Name): Promise<GetPersonResponse> {
        let data;
        const api = await getApi();

        if (account instanceof TonomyUsername) {
            // this is a username
            const usernameHash = account.usernameHash;

            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'people',
                // eslint-disable-next-line camelcase
                lower_bound: Checksum256.from(usernameHash),
                limit: 1,
                // eslint-disable-next-line camelcase
                index_position: 'secondary',
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].username_hash.toString() !== usernameHash) {
                throwError('Person with username "' + account.username + '" not found', SdkErrors.UsernameNotFound);
            }
        } else {
            // use the account name directly
            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'people',
                // eslint-disable-next-line camelcase
                lower_bound: account,
                limit: 1,
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].account_name !== account.toString()) {
                throwError(
                    'Person with account name "' + account.toString() + '" not found',
                    SdkErrors.AccountDoesntExist
                );
            }
        }

        const idData = data.rows[0];

        return {
            // eslint-disable-next-line camelcase
            account_name: Name.from(idData.account_name),
            status: idData.status,
            // eslint-disable-next-line camelcase
            username_hash: Checksum256.from(idData.username_hash),
            // eslint-disable-next-line camelcase
            password_salt: Checksum256.from(idData.password_salt),
            version: idData.version,
        };
    }

    async getApp(account: TonomyUsername | Name | string): Promise<AppTableRecord> {
        let data;
        const api = await getApi();

        if (account instanceof TonomyUsername) {
            // this is a username
            const usernameHash = account.usernameHash;

            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'apps',
                // eslint-disable-next-line camelcase
                lower_bound: Checksum256.from(usernameHash),
                limit: 1,
                // eslint-disable-next-line camelcase
                index_position: 'secondary',
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].username_hash.toString() !== usernameHash) {
                throwError('Account with username "' + account.username + '" not found', SdkErrors.UsernameNotFound);
            }
        } else if (account instanceof Name) {
            // use the account name directly
            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'apps',
                // eslint-disable-next-line camelcase
                lower_bound: account,
                limit: 1,
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].account_name !== account.toString()) {
                throwError('Account "' + account.toString() + '" not found', SdkErrors.AccountDoesntExist);
            }
        } else {
            // account is the origin
            const origin = account;
            const originHash = sha256(origin);

            data = await api.v1.chain.get_table_rows({
                code: 'id.tonomy',
                scope: 'id.tonomy',
                table: 'apps',
                // eslint-disable-next-line camelcase
                lower_bound: Checksum256.from(originHash),
                limit: 1,
                // eslint-disable-next-line camelcase
                index_position: 'tertiary',
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].origin !== origin) {
                throwError('Account with origin "' + origin + '" not found', SdkErrors.OriginNotFound);
            }
        }

        const idData = data.rows[0];

        return {
            // eslint-disable-next-line camelcase
            app_name: idData.app_name,
            description: idData.description,
            // eslint-disable-next-line camelcase
            logo_url: idData.logo_url,
            origin: idData.origin,
            // eslint-disable-next-line camelcase
            account_name: Name.from(idData.account_name),
            // eslint-disable-next-line camelcase
            username_hash: Checksum256.from(idData.username_hash),
            version: idData.version,
        };
    }
}

export { IDContract, GetPersonResponse };
