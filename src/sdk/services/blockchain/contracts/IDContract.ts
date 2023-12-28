/* eslint-disable camelcase */
import { API, Checksum256, Name, PublicKey } from '@wharfkit/antelope';
import { TonomyUsername } from '../../../util/username';
import { getAccount, getApi } from '../eosio/eosio';
import { ActionData, Signer, transact } from '../eosio/transaction';
import { SdkErrors, throwError } from '../../../util/errors';
import { sha256 } from '../../../util/crypto';

const CONTRACT_NAME = 'id.tmy';

enum PermissionLevel {
    OWNER = 'OWNER',
    ACTIVE = 'ACTIVE',
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    BIOMETRIC = 'BIOMETRIC',
    LOCAL = 'LOCAL',
}

enum AccountTypeEnum {
    Person = 0,
    Organization = 1,
    App = 2,
    Gov = 3,
    Service = 4,
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
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'newperson',
            data: {
                username_hash,
                password_key,
                password_salt,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
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
        const accountInfo = await getAccount(account);

        const actions = [];

        if (Object.keys(keys).length === 0)
            throwError('At least one key must be provided', SdkErrors.UpdateKeysTransactionNoKeys);

        for (const key in keys) {
            const permission = PermissionLevel.from(key);

            // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
            const publicKey = (keys as any)[key];

            let link_auth = true;

            try {
                const accountPermission = accountInfo.getPermission(permission.toLowerCase());

                if (
                    accountPermission &&
                    accountPermission.linked_actions.find(
                        (a) => a.account.equals(CONTRACT_NAME) && a.action.equals('loginwithapp')
                    )
                ) {
                    link_auth = false;
                }
            } catch (e) {
                if (!e.message.startsWith('Unknown permission ')) {
                    throw e;
                }
            }

            actions.push({
                authorization: [
                    {
                        actor: account,
                        permission: 'active',
                    },
                ],
                account: CONTRACT_NAME,
                name: 'updatekeyper',
                data: {
                    account,
                    permission: PermissionLevel.indexFor(permission),
                    key: publicKey,
                    link_auth,
                },
            });
        }

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
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
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
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

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
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
            account: CONTRACT_NAME,
            name: 'loginwithapp',
            data: {
                account,
                app,
                parent,
                key,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async getPerson(account: TonomyUsername | Name): Promise<GetPersonResponse> {
        let data;
        const api = await getApi();

        if (account instanceof TonomyUsername) {
            // this is a username
            const usernameHash = account.usernameHash;

            data = await api.v1.chain.get_table_rows({
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
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
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
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

    /**
     * @param account - the permission's owner to be linked and the payer of the RAM needed to store this link,
     * @param code - the owner of the action to be linked,
     * @param type - the action to be linked,
     * @param requirement - the permission to be linked.
     */
    async linkAuth(
        account: string,
        code: string,
        type: string,
        requirement: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action: ActionData = {
            account: CONTRACT_NAME,
            name: 'linkauth',
            authorization: [
                {
                    actor: account,
                    permission: 'active',
                },
            ],
            data: {
                account,
                code,
                type,
                requirement,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async getApp(account: TonomyUsername | Name | string): Promise<AppTableRecord> {
        let data;
        const api = await getApi();

        if (account instanceof TonomyUsername) {
            // this is a username
            const usernameHash = account.usernameHash;

            data = await api.v1.chain.get_table_rows({
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
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
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
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
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
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

    async setAccountType(
        accountName: string,
        accType: AccountTypeEnum,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'setacctype',
            data: {
                account_name: Name.from(accountName),
                acc_type: accType,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }
}

export async function getAccountNameFromUsername(username: TonomyUsername): Promise<Name> {
    return (await IDContract.Instance.getPerson(username)).account_name;
}

export { IDContract, GetPersonResponse, AccountTypeEnum };
