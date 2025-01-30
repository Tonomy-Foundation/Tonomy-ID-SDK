/* eslint-disable camelcase */
import { API, Checksum256, Checksum256Type, Name, NameType, PublicKey } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { SdkErrors, TonomyUsername, getSettings, sha256, throwError } from '../../../util';
import { getAccount, getApi } from '../eosio/eosio';
import { LEOS_PUBLIC_SALE_PRICE } from './VestingContract';
import { Authority } from '../eosio/authority';

const CONTRACT_NAME = 'tonomy';

export const GOVERNANCE_ACCOUNT_NAME = 'tonomy';

enum PermissionLevel {
    OWNER = 'OWNER',
    ACTIVE = 'ACTIVE',
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    BIOMETRIC = 'BIOMETRIC',
    LOCAL = 'LOCAL',
}

export enum AccountTypeEnum {
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

export type GetPersonResponse = {
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

function calculateRamPrice(): number {
    // See https://docs.google.com/spreadsheets/d/1_S0S7Gu-PHzt-IzCqNl3CaWnniAt1KwaXDB50roTZUQ/edit?gid=1773951365#gid=1773951365&range=C84

    const ramPricePerGb = 7; // $7.00 per GB of RAM taken from standard AWS EC2 pricing
    const numberOfNodes = 29;
    const costOverhead = 1; // 100% overhead
    const totalRamPrice = ramPricePerGb * numberOfNodes * (1 + costOverhead); // $ / Gb
    const totalRamPriceBytes = totalRamPrice / (1024 * 1024 * 1024); // $ / byte

    return LEOS_PUBLIC_SALE_PRICE / totalRamPriceBytes; // bytes / LEOS
}

export const RAM_PRICE = calculateRamPrice(); // bytes / token
export const RAM_FEE = 0.25 / 100; // 0.25%
export const TOTAL_RAM_AVAILABLE = 8 * 1024 * 1024 * 1024; // 8 GB

/**
 * Converts bytes to tokens.
 *
 * @param bytes The number of bytes to convert.
 * @returns The converted value in tokens.
 */
export function bytesToTokens(bytes: number): string {
    return ((bytes * (1 + RAM_FEE)) / RAM_PRICE).toFixed(6) + ` ${getSettings().currencySymbol}`;
}

export class TonomyContract {
    static singletonInstance: TonomyContract;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }
    /**
     * Buys RAM for an account
     *
     * @param  daoOwner - The owner of the DAO (Name is assumed to be a class that represents an EOSIO account name)
     * @param account - The name of the app buying RAM (Name is assumed to be a class that represents an EOSIO account name)
     * @param quant - The quantity of RAM to buy (Asset is assumed to be a class that represents an EOSIO asset)
     */
    async buyRam(
        dao_owner: string,
        app: string,
        quant: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'buyram',
                authorization: [
                    {
                        actor: app,
                        permission: 'active',
                    },
                    {
                        actor: dao_owner,
                        permission: 'active',
                    },
                ],
                data: {
                    dao_owner,
                    app,
                    quant,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    /**
     * Sets the resource parameters 
     *
     * @param ram_price - The price of RAM (bytes per token)
     * @param total_ram_available - The total available RAM.
     * @param ram_fee - The fee for RAM.
    
     */
    async setResourceParams(
        ram_price: number,
        total_ram_available: number,
        ram_fee: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: GOVERNANCE_ACCOUNT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'setresparams',
            data: {
                ram_price,
                total_ram_available,
                ram_fee,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
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

    async updateactive(account: string, active: Authority, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: account,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'updateactive',
            data: {
                account,
                active,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
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

                lower_bound: Checksum256.from(usernameHash),
                limit: 1,

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
            account_name: Name.from(idData.account_name),
            status: idData.status,

            username_hash: Checksum256.from(idData.username_hash),

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
                code: CONTRACT_NAME,
                scope: CONTRACT_NAME,
                table: 'apps',

                lower_bound: Checksum256.from(usernameHash),
                limit: 1,

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

                lower_bound: Checksum256.from(originHash),
                limit: 1,

                index_position: 'tertiary',
            });
            if (!data || !data.rows) throwError('No data found', SdkErrors.DataQueryNoRowDataFound);

            if (data.rows.length === 0 || data.rows[0].origin !== origin) {
                throwError('Account with origin "' + origin + '" not found', SdkErrors.OriginNotFound);
            }
        }

        const idData = data.rows[0];

        return {
            app_name: idData.app_name,
            description: idData.description,

            logo_url: idData.logo_url,
            origin: idData.origin,

            account_name: Name.from(idData.account_name),

            username_hash: Checksum256.from(idData.username_hash),
            version: idData.version,
        };
    }

    async adminSetApp(
        accountName: NameType,
        appName: string,
        description: string,
        usernameHash: Checksum256Type,
        logoUrl: string,
        origin: string,
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
            name: 'adminsetapp',
            data: {
                account_name: Name.from(accountName),
                app_name: appName,
                description,
                username_hash: usernameHash,
                logo_url: logoUrl,
                origin,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }
}

export async function getAccountNameFromUsername(username: TonomyUsername): Promise<Name> {
    return (await TonomyContract.Instance.getPerson(username)).account_name;
}
