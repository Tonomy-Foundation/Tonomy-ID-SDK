/* eslint-disable camelcase */
import {
    API,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    PublicKey,
    Action,
    AuthorityType,
    AssetType,
    PublicKeyType,
} from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { Signer, transact } from '../eosio/transaction';
import { SdkErrors, TonomyUsername, sha256, throwError } from '../../../util';
import { getAccount, getApi } from '../eosio/eosio';
import abi from '../../../../../Tonomy-Contracts/contracts/tonomy/tonomy.abi.json';
import { activeAuthority } from '../eosio/authority';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:contracts:tonomy');

const CONTRACT_NAME: NameType = 'tonomy';

export const GOVERNANCE_ACCOUNT_NAME: NameType = 'tonomy';

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

type PersonDataRaw = {
    account_name: Name;
    status: number;
    username_hash: Checksum256;
    password_salt: Checksum256;
    version: number;
};

type PersonData = {
    accountName: Name;
    status: number;
    usernameHash: Checksum256;
    passwordSalt: Checksum256;
    version: number;
};

type AppData2Raw = {
    account_name: Name;
    json_data: string;
    username_hash: Checksum256;
    origin: string;
    version: number;
};

type AppData2 = {
    accountName: Name;
    usernameHash: Checksum256;
    origin: string;
    version: number;
    jsonData: string;
    appName: string;
    description: string;
    logoUrl: string;
    backgroundColor: string;
    accentColor: string;
};

export class TonomyContract extends Contract {
    static async atAccount(account: NameType = CONTRACT_NAME): Promise<TonomyContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): TonomyContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, false);
    }

    actions = {
        buyram: (
            data: { daoOwner: NameType; app: NameType; quant: AssetType },
            authorization: ActionOptions = {
                authorization: [
                    { actor: data.daoOwner, permission: 'active' },
                    // TODO: remove this when the app is not required to buy RAM (change the contract first)
                    { actor: data.app, permission: 'active' },
                ],
            }
        ): Action =>
            this.action('buyram', { dao_owner: data.daoOwner, app: data.app, quant: data.quant }, authorization),
        setresparams: (
            data: { ramPrice: number; totalRamAvailable: number; ramFee: number },
            authorization: ActionOptions = activeAuthority(GOVERNANCE_ACCOUNT_NAME)
        ): Action =>
            this.action(
                'setresparams',
                {
                    ram_price: data.ramPrice,
                    total_ram_available: data.totalRamAvailable,
                    ram_fee: data.ramFee,
                },
                authorization
            ),
        newperson: (
            data: { usernameHash: Checksum256Type; passwordKey: PublicKeyType; passwordSalt: Checksum256Type },
            authorization?: ActionOptions
        ): Action =>
            this.action(
                'newperson',
                {
                    username_hash: data.usernameHash,
                    password_key: data.passwordKey,
                    password_salt: data.passwordSalt,
                },
                authorization
            ),
        updateactive: (
            data: { account: NameType; active: AuthorityType },
            authorization: ActionOptions = activeAuthority(data.account)
        ): Action => this.action('updateactive', data, authorization),
        updatekeyper: (
            data: { account: NameType; permission_level: number; key: PublicKeyType; link_auth?: boolean },
            authorization: ActionOptions = { authorization: [{ actor: data.account, permission: 'owner' }] }
        ): Action =>
            this.action(
                'updatekeyper',
                {
                    account: data.account,
                    permission: data.permission_level,
                    key: data.key,
                    link_auth: data.link_auth ?? true,
                },
                authorization
            ),
        loginwithapp: (
            data: { account: NameType; app: NameType; parent: NameType; key: PublicKeyType },
            authorization: ActionOptions = { authorization: [{ actor: data.account, permission: data.parent }] }
        ): Action => this.action('loginwithapp', data, authorization),
        newapp: (
            data: {
                jsonData: string;
                usernameHash: Checksum256Type;
                origin: string;
                key: PublicKeyType;
            },
            authorization?: ActionOptions
        ): Action =>
            this.action(
                'newapp',
                {
                    json_data: data.jsonData,
                    username_hash: data.usernameHash,
                    origin: data.origin,
                    key: data.key,
                },
                authorization
            ),
        adminsetapp: (
            data: {
                accountName: NameType;
                jsonData: string;
                usernameHash: Checksum256Type;
                origin: string;
            },
            authorization?: ActionOptions
        ): Action =>
            this.action(
                'adminsetapp',
                {
                    account_name: Name.from(data.accountName),
                    json_data: data.jsonData,
                    username_hash: data.usernameHash,
                    origin: data.origin,
                },
                authorization
            ),
    };

    async buyRam(
        daoOwner: NameType,
        app: NameType,
        quant: AssetType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.buyram({ daoOwner, app, quant });

        return transact([action], signer);
    }

    async setResourceParams(
        ramPrice: number,
        totalRamAvailable: number,
        ramFee: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setresparams({ ramPrice, totalRamAvailable, ramFee });

        return transact([action], signer);
    }

    async newPerson(
        usernameHash: Checksum256Type,
        passwordKey: PublicKeyType,
        passwordSalt: Checksum256Type,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.newperson({ usernameHash, passwordKey, passwordSalt });

        return transact([action], signer);
    }

    async updateKeysPer(
        account: NameType,
        keys: {
            BIOMETRIC?: PublicKeyType;
            PIN?: PublicKeyType;
            LOCAL?: PublicKeyType;
        },
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const accountInfo = await getAccount(account);

        if (Object.keys(keys).length === 0)
            throwError('At least one key must be provided', SdkErrors.UpdateKeysTransactionNoKeys);

        const actions: Action[] = [];

        for (const key in keys) {
            const permission = PermissionLevel.from(key);

            // "keys as any" fixes typescript issue see https://stackoverflow.com/a/57192972
            const publicKey = (keys as any)[key] as PublicKeyType;

            let link_auth = true;

            try {
                const accountPermission = accountInfo.getPermission(permission.toLowerCase());

                if (
                    accountPermission &&
                    accountPermission.linked_actions.find(
                        (a) => a.account.equals(this.contractName) && a.action.equals('loginwithapp')
                    )
                ) {
                    link_auth = false;
                }
            } catch (e) {
                if (!e.message.startsWith('Unknown permission ')) {
                    throw e;
                }
            }

            actions.push(
                this.actions.updatekeyper(
                    {
                        account,
                        permission_level: PermissionLevel.indexFor(permission),
                        key: publicKey,
                        link_auth,
                    },
                    activeAuthority(account)
                )
            );
        }

        return transact(actions, signer);
    }

    async updateActive(
        account: NameType,
        active: AuthorityType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.updateactive({ account, active });

        return transact([action], signer);
    }

    async newApp(
        appName: string,
        description: string,
        usernameHash: Checksum256Type,
        logoUrl: string,
        origin: string,
        backgroundColor: string,
        accentColor: string,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = JSON.stringify({
            app_name: appName,
            description,
            logo_url: logoUrl,
            background_color: backgroundColor,
            accent_color: accentColor,
        });
        const action = this.actions.newapp({
            jsonData,
            usernameHash,
            origin,
            key,
        });

        return transact([action], signer);
    }

    async loginWithApp(
        account: NameType,
        app: NameType,
        parent: NameType,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.loginwithapp({ account, app, parent, key });

        return transact([action], signer);
    }

    async getPersonData(account: NameType): Promise<PersonDataRaw> {
        const res = this.contract.table<PersonDataRaw>('people', this.contractName).get(account);

        if (!res) {
            throwError(`Person "${account.toString()}" not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }

    async getPersonDataByUsername(username: TonomyUsername): Promise<PersonDataRaw> {
        const hash = Checksum256.from(username.usernameHash);

        const res = this.contract
            .table<PersonDataRaw>('people', this.contractName)
            .get(hash, { index_position: 'secondary' });

        if (!res) {
            throwError(`Person with username "${username.toString()}" not found`, SdkErrors.UsernameNotFound);
        }

        return res;
    }

    async getAppData2s(): Promise<AppData2Raw[]> {
        const res = await this.contract.table<AppData2Raw>('appsv2', this.contractName).all();

        if (!res || res.length === 0) {
            throwError(`Apps not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }

    async getAppData2(account: NameType): Promise<AppData2Raw> {
        const res = await this.contract.table<AppData2Raw>('appsv2', this.contractName).get(account);

        if (!res) {
            throwError(`App "${account.toString()}" not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }
    async getAppData2ByUsername(username: TonomyUsername): Promise<AppData2Raw> {
        const hash = Checksum256.from(username.usernameHash);
        const res = await this.contract
            .table<AppData2Raw>('appsv2', this.contractName)
            .get(hash, { index_position: 'secondary' });

        if (!res) {
            throwError(`App with username "${username.toString()}" not found`, SdkErrors.UsernameNotFound);
        }

        return res;
    }

    async getAppDataByOrigin(origin: string): Promise<AppData2Raw> {
        const originHash = sha256(origin);
        const res = await this.contract
            .table<AppData2Raw>('appsv2', this.contractName)
            .get(Checksum256.from(originHash), { index_position: 'tertiary' });

        if (!res) {
            throwError(`Origin "${origin}" not found`, SdkErrors.OriginNotFound);
        }

        return res;
    }

    async getPerson(account: TonomyUsername | NameType): Promise<PersonData> {
        let personData: PersonDataRaw;

        if (account instanceof TonomyUsername) {
            personData = await this.getPersonDataByUsername(account);
        } else {
            personData = await this.getPersonData(account);
        }

        return {
            accountName: personData.account_name,
            status: personData.status,
            usernameHash: personData.username_hash,
            passwordSalt: personData.password_salt,
            version: personData.version,
        };
    }

    async getApp(account: TonomyUsername | Name | string): Promise<AppData2> {
        let appData: AppData2Raw;

        if (account instanceof TonomyUsername) {
            appData = await this.getAppData2ByUsername(account);
        } else if (account instanceof Name) {
            appData = await this.getAppData2(account);
        } else {
            appData = await this.getAppDataByOrigin(account);
        }

        const json = JSON.parse(appData.json_data);

        return {
            accountName: appData.account_name,
            appName: json.app_name,
            description: json.description,
            logoUrl: json.logo_url,
            origin: appData.origin,
            backgroundColor: json.background_color,
            accentColor: json.accent_color,
            usernameHash: appData.username_hash,
            version: appData.version,
            jsonData: appData.json_data,
        };
    }

    async getApps(): Promise<AppData2[]> {
        const apps = await this.getAppData2s();

        return apps.map((app) => {
            const json = JSON.parse(app.json_data);

            return {
                accountName: app.account_name,
                appName: json.app_name,
                description: json.description,
                logoUrl: json.logo_url,
                origin: app.origin,
                backgroundColor: json.background_color,
                accentColor: json.accent_color,
                usernameHash: app.username_hash,
                version: app.version,
                jsonData: app.json_data,
            };
        });
    }

    async adminSetApp(
        accountName: NameType,
        appName: string,
        description: string,
        usernameHash: Checksum256Type,
        logoUrl: string,
        origin: string,
        backgroundColor: string,
        accentColor: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = JSON.stringify({
            app_name: appName,
            description,
            logo_url: logoUrl,
            background_color: backgroundColor,
            accent_color: accentColor,
        });
        const action = this.actions.adminsetapp({
            accountName,
            jsonData,
            usernameHash,
            origin,
        });

        return transact([action], signer);
    }
}

export const tonomyContract = TonomyContract.fromAbi(abi);

export default async function loadTonomyContract(account: NameType = CONTRACT_NAME): Promise<TonomyContract> {
    return await TonomyContract.atAccount(account);
}
