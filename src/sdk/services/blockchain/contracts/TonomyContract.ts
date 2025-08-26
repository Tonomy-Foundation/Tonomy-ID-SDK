/* eslint-disable camelcase */
import {
    API,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    Action,
    AuthorityType,
    AssetType,
    PublicKeyType,
    UInt8,
    UInt16,
} from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { Contract as AntelopeContract, ActionOptions, QueryParams } from '@wharfkit/contract';
import { Signer, transact } from '../eosio/transaction';
import { TonomyUsername } from '../../../util/username';
import { SdkErrors, throwError } from '../../../util/errors';
import { getSettings, isProduction } from '../../../util/settings';
import { sha256 } from '../../../util/crypto';
import { getAccount, getApi } from '../eosio/eosio';
import abi from './abi/tonomy.abi.json';
import { activeAuthority, ownerAuthority } from '../eosio/authority';
import { TONO_PUBLIC_SALE_PRICE } from './VestingContract';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:blockchain:contracts:TonomyContract');

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
    status: UInt8;
    username_hash: Checksum256;
    password_salt: Checksum256;
};

function castPersonDataRaw(person: PersonDataRaw): PersonData {
    return {
        accountName: person.account_name,
        status: person.status.toNumber(),
        usernameHash: person.username_hash,
        passwordSalt: person.password_salt,
    };
}

export type PersonData = {
    accountName: Name;
    status: number;
    usernameHash: Checksum256;
    passwordSalt: Checksum256;
};

type AppData2Raw = {
    account_name: Name;
    json_data: string;
    username_hash: Checksum256;
    origin: string;
    version: UInt16;
};

type AppJsonDataRaw = {
    app_name: string;
    description: string;
    logo_url: string;
    background_color: string;
    accent_color: string;
};

export type AppData2 = {
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

function parseAppJsonData(jsonString: string): AppJsonDataRaw {
    return JSON.parse(jsonString);
}

export function createAppJsonDataString(
    appName: string,
    description: string,
    logoUrl: string,
    backgroundColor: string,
    accentColor: string
): string {
    return JSON.stringify({
        app_name: appName,
        description,
        logo_url: logoUrl,
        background_color: backgroundColor,
        accent_color: accentColor,
    });
}

function castAppData2Raw(app: AppData2Raw): AppData2 {
    const json = parseAppJsonData(app.json_data);

    return {
        accountName: app.account_name,
        appName: json.app_name,
        description: json.description,
        logoUrl: json.logo_url,
        origin: app.origin,
        backgroundColor: json.background_color,
        accentColor: json.accent_color,
        usernameHash: app.username_hash,
        version: app.version.toNumber(),
        jsonData: app.json_data,
    };
}

function calculateRamPrice(): number {
    // See https://docs.google.com/spreadsheets/d/1_S0S7Gu-PHzt-IzCqNl3CaWnniAt1KwaXDB50roTZUQ/edit?gid=1773951365#gid=1773951365&range=C84

    const ramPricePerGb = 7; // $7.00 per GB of RAM taken from standard AWS EC2 pricing
    const numberOfNodes = 29;
    const costOverhead = 1; // 100% overhead
    const totalRamPrice = ramPricePerGb * numberOfNodes * (1 + costOverhead); // $ / Gb
    const totalRamPriceBytes = totalRamPrice / (1024 * 1024 * 1024); // $ / byte

    return TONO_PUBLIC_SALE_PRICE / totalRamPriceBytes; // bytes / TONO
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

export class TonomyContract extends Contract {
    static async atAccount(account: NameType = CONTRACT_NAME): Promise<TonomyContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): TonomyContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, isProduction());
    }

    actions = {
        buyRam: (
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
        setResParams: (
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
        newPerson: (
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
        updateActive: (
            data: { account: NameType; active: AuthorityType },
            authorization: ActionOptions = activeAuthority(data.account)
        ): Action => this.action('updateactive', data, authorization),
        updateKeyPer: (
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
        loginWithApp: (
            data: { account: NameType; app: NameType; parent: NameType; key: PublicKeyType },
            authorization: ActionOptions = { authorization: [{ actor: data.account, permission: data.parent }] }
        ): Action => this.action('loginwithapp', data, authorization),
        newApp: (
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
        adminSetApp: (
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
        eraseOldApps: (data = {}, authorization: ActionOptions = ownerAuthority(this.contractName)): Action =>
            this.action('eraseoldapps', data, authorization),
    };

    async buyRam(
        daoOwner: NameType,
        app: NameType,
        quant: AssetType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.buyRam({ daoOwner, app, quant });

        return transact(action, signer);
    }

    async setResourceParams(
        ramPrice: number,
        totalRamAvailable: number,
        ramFee: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setResParams({ ramPrice, totalRamAvailable, ramFee });

        return transact(action, signer);
    }

    async newPerson(
        usernameHash: Checksum256Type,
        passwordKey: PublicKeyType,
        passwordSalt: Checksum256Type,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.newPerson({ usernameHash, passwordKey, passwordSalt });

        return transact(action, signer);
    }

    async updateKeysPerson(
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
                this.actions.updateKeyPer(
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
        const action = this.actions.updateActive({ account, active });

        return transact(action, signer);
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
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.newApp({
            jsonData,
            usernameHash,
            origin,
            key,
        });

        return transact(action, signer);
    }

    async loginWithApp(
        account: NameType,
        app: NameType,
        parent: NameType,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.loginWithApp({ account, app, parent, key });

        return transact(action, signer);
    }

    async getPersonData(account: NameType): Promise<PersonDataRaw> {
        const res = await this.contract.table<PersonDataRaw>('people', this.contractName).get(account);

        if (!res) {
            throwError(`Person "${account.toString()}" not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }

    async getPersonDataByUsername(username: TonomyUsername): Promise<PersonDataRaw> {
        const hash = Checksum256.from(username.usernameHash);

        const res = await this.contract
            .table<PersonDataRaw>('people', this.contractName)
            .get(hash, { index_position: 'secondary' });

        if (!res) {
            throwError(`Person with username "${username.toString()}" not found`, SdkErrors.UsernameNotFound);
        }

        return res;
    }

    async getAllAppData2(): Promise<AppData2Raw[]> {
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

        debug('getPerson', account, account instanceof TonomyUsername);

        if (account instanceof TonomyUsername) {
            personData = await this.getPersonDataByUsername(account);
        } else {
            personData = await this.getPersonData(account);
        }

        return castPersonDataRaw(personData);
    }

    async getPeople(query?: QueryParams): Promise<PersonData[]> {
        const cursor = this.contract.table<PersonDataRaw>('people', this.contractName).query(query);

        return (await cursor.next()).map(castPersonDataRaw);
    }

    async getAllPeople(limit: number = 100): Promise<PersonData[]> {
        const cursor = this.contract.table<PersonDataRaw>('people', this.contractName).query({
            maxRows: limit,
        });

        return (await cursor.all()).map(castPersonDataRaw);
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

        return castAppData2Raw(appData);
    }

    async getAllApps(): Promise<AppData2[]> {
        const apps = await this.getAllAppData2();

        return apps.map(castAppData2Raw);
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
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.adminSetApp({
            accountName,
            jsonData,
            usernameHash,
            origin,
        });

        return transact([action], signer);
    }
}

let tonomyContract: TonomyContract | undefined;

export const getTonomyContract = () => {
    if (!tonomyContract) {
        tonomyContract = TonomyContract.fromAbi(abi);
    }

    return tonomyContract;
};

export async function getAccountNameFromUsername(username: TonomyUsername): Promise<NameType> {
    return (await getTonomyContract().getPersonDataByUsername(username)).account_name;
}
