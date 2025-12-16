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
import { activeAuthority } from '../eosio/authority';
import Debug from 'debug';
import { getTokenPrice } from './EosioTokenContract';

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

type AppDataRaw = {
    account_name: Name;
    json_data: string;
    username: string;
    origin: string;
    plan: UInt8;
    version: UInt16;
};

export enum AppPlan {
    BASIC = 'BASIC',
    PRO = 'PRO',
}

type AppJsonDataRaw = {
    app_name: string;
    description: string;
    logo_url: string;
    background_color: string; // hex string starting with #
    accent_color: string; // hex string starting with #
};

export type AppData = {
    accountName: Name;
    username: string;
    origin: string;
    plan: AppPlan;
    version: number;
    jsonData: string;
    appName: string;
    description: string;
    logoUrl: string;
    backgroundColor: string;
    accentColor: string;
};

// Alias retained for callers that still import AppData2
export type AppData2 = AppData;

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

function addPrefixIfMissing(str: string, prefix: string): string {
    if (!str.startsWith(prefix)) {
        return prefix + str;
    }

    return str;
}

function planFromUInt8(plan: UInt8 | number): AppPlan {
    const value = typeof plan === 'number' ? plan : plan.toNumber();

    switch (value) {
        case 0:
            return AppPlan.BASIC;
        case 1:
            return AppPlan.PRO;
        default:
            throwError(`Unknown app plan value: ${value}`, SdkErrors.InvalidData);
    }
}

function castAppDataRaw(app: AppDataRaw): AppData {
    const json = parseAppJsonData(app.json_data);

    return {
        accountName: app.account_name,
        appName: json.app_name,
        description: json.description,
        logoUrl: json.logo_url,
        origin: app.origin,
        backgroundColor: json.background_color,
        accentColor: json.accent_color,
        username: addPrefixIfMissing(app.username, '@') + '.app',
        plan: planFromUInt8(app.plan),
        version: app.version.toNumber(),
        jsonData: app.json_data,
    };
}

async function calculateRamPrice(): Promise<number> {
    // See https://docs.google.com/spreadsheets/d/1_S0S7Gu-PHzt-IzCqNl3CaWnniAt1KwaXDB50roTZUQ/edit?gid=1773951365#gid=1773951365&range=C84

    const ramPricePerGb = 7; // $7.00 per GB of RAM taken from standard AWS EC2 pricing
    const numberOfNodes = 29;
    const costOverhead = 1; // 100% overhead
    const totalRamPrice = ramPricePerGb * numberOfNodes * (1 + costOverhead); // $ / Gb
    const totalRamPriceBytes = totalRamPrice / (1024 * 1024 * 1024); // $ / byte

    const price = await getTokenPrice();

    return price / totalRamPriceBytes; // bytes / TONO
}

export const RAM_FEE = 0.25 / 100; // 0.25%
export const TOTAL_RAM_AVAILABLE = 8 * 1024 * 1024 * 1024; // 8 GB

/**
 * Converts bytes to tokens.
 *
 * @param bytes The number of bytes to convert.
 * @returns The converted value in tokens.
 */
export async function bytesToTokens(bytes: number): Promise<string> {
    const ramPrice = await calculateRamPrice();

    return ((bytes * (1 + RAM_FEE)) / ramPrice).toFixed(6) + ` ${getSettings().currencySymbol}`;
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
        appCreate: (
            data: { creator: NameType; jsonData: string; username: string; origin: string },
            authorization: ActionOptions = { authorization: [{ actor: data.creator, permission: 'active' }] }
        ): Action =>
            this.action(
                'appcreate',
                {
                    creator: data.creator,
                    json_data: data.jsonData,
                    username: data.username,
                    origin: data.origin,
                },
                authorization
            ),
        appUpdate: (
            data: { accountName: NameType; jsonData: string; username: string },
            authorization: ActionOptions = { authorization: [{ actor: data.accountName, permission: 'active' }] }
        ): Action =>
            this.action(
                'appupdate',
                {
                    account_name: data.accountName,
                    json_data: data.jsonData,
                    username: data.username,
                },
                authorization
            ),
        appUpdatePlan: (
            data: { accountName: NameType; plan: number },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action => this.action('appupdplan', { account_name: data.accountName, plan: data.plan }, authorization),
        scDeploy: (
            data: {
                accountName: NameType;
                vmtype: number;
                vmversion: number;
                code: Array<number>;
                abi: Array<number>;
                sourceCodeUrl: string;
            },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'scdeploy',
                {
                    account_name: data.accountName,
                    vmtype: data.vmtype,
                    vmversion: data.vmversion,
                    code: data.code,
                    abi: data.abi,
                    source_code_url: data.sourceCodeUrl,
                },
                authorization
            ),
        scUpdate: (
            data: {
                accountName: NameType;
                vmtype: number;
                vmversion: number;
                code: Array<number>;
                abi: Array<number>;
                sourceCodeUrl: string;
            },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'scupdate',
                {
                    account_name: data.accountName,
                    vmtype: data.vmtype,
                    vmversion: data.vmversion,
                    code: data.code,
                    abi: data.abi,
                    source_code_url: data.sourceCodeUrl,
                },
                authorization
            ),
        scBuyRam: (
            data: { accountName: NameType; quant: AssetType },
            authorization: ActionOptions = { authorization: [{ actor: data.accountName, permission: 'active' }] }
        ): Action => this.action('scbuyram', { account_name: data.accountName, quant: data.quant }, authorization),
        scSellRam: (
            data: { accountName: NameType; quant: AssetType },
            authorization: ActionOptions = { authorization: [{ actor: data.accountName, permission: 'active' }] }
        ): Action => this.action('scsellram', { account_name: data.accountName, quant: data.quant }, authorization),
        appAddKey: (
            data: { accountName: NameType; key: PublicKeyType },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action => this.action('appaddkey', { account_name: data.accountName, key: data.key }, authorization),
        appRemoveKey: (
            data: { accountName: NameType; key: PublicKeyType },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action => this.action('appremkey', { account_name: data.accountName, key: data.key }, authorization),
        adminCreateApp: (
            data: { jsonData: string; username: string; origin: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'admncrtapp',
                {
                    json_data: data.jsonData,
                    username: data.username,
                    origin: data.origin,
                },
                authorization
            ),
        adminUpdateApp: (
            data: { accountName: NameType; jsonData: string; username: string; origin: string; plan: number },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'admnupdapp',
                {
                    account_name: data.accountName,
                    json_data: data.jsonData,
                    username: data.username,
                    origin: data.origin,
                    plan: data.plan,
                },
                authorization
            ),
        adminDeleteApp: (
            data: { accountName: NameType },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action => this.action('admndelapp', { account_name: data.accountName }, authorization),
        adminMigrateApp: (
            data: { accountName: NameType; username: string; plan: number; key: PublicKeyType },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'admnmigapp',
                {
                    account_name: data.accountName,
                    username: data.username,
                    plan: data.plan,
                    key: data.key,
                },
                authorization
            ),
        adminMigrateSc: (
            data: { accountName: NameType; sourceCodeUrl: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ): Action =>
            this.action(
                'admnmigsc',
                {
                    account_name: data.accountName,
                    source_code_url: data.sourceCodeUrl,
                },
                authorization
            ),
    };

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

    async appCreate(
        creator: NameType,
        appName: string,
        description: string,
        username: string,
        logoUrl: string,
        origin: string,
        backgroundColor: string,
        accentColor: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.appCreate({ creator, jsonData, username, origin });

        return transact(action, signer);
    }

    async appUpdate(
        accountName: NameType,
        appName: string,
        description: string,
        username: string,
        logoUrl: string,
        backgroundColor: string,
        accentColor: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.appUpdate({ accountName, jsonData, username });

        return transact(action, signer);
    }

    async appUpdatePlan(accountName: NameType, plan: number, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.appUpdatePlan({ accountName, plan });

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

    async scBuyRam(accountName: NameType, quant: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.scBuyRam({ accountName, quant });

        return transact(action, signer);
    }

    async scSellRam(accountName: NameType, quant: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.scSellRam({ accountName, quant });

        return transact(action, signer);
    }

    async scDeploy(
        accountName: NameType,
        vmtype: number,
        vmversion: number,
        code: Array<number>,
        abi: Array<number>,
        sourceCodeUrl: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.scDeploy({ accountName, vmtype, vmversion, code, abi, sourceCodeUrl });

        return transact(action, signer);
    }

    async scUpdate(
        accountName: NameType,
        vmtype: number,
        vmversion: number,
        code: Array<number>,
        abi: Array<number>,
        sourceCodeUrl: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.scUpdate({ accountName, vmtype, vmversion, code, abi, sourceCodeUrl });

        return transact(action, signer);
    }

    async appAddKey(
        accountName: NameType,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.appAddKey({ accountName, key });

        return transact(action, signer);
    }

    async appRemoveKey(
        accountName: NameType,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.appRemoveKey({ accountName, key });

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

    async getAllAppData(): Promise<AppDataRaw[]> {
        const res = await this.contract.table<AppDataRaw>('appsv3', this.contractName).all();

        if (!res || res.length === 0) {
            throwError(`Apps not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }

    async getAppData(account: NameType): Promise<AppDataRaw> {
        const res = await this.contract.table<AppDataRaw>('appsv3', this.contractName).get(account);

        if (!res) {
            throwError(`App "${account.toString()}" not found`, SdkErrors.AccountDoesntExist);
        }

        return res;
    }
    async getAppDataByUsername(username: TonomyUsername): Promise<AppDataRaw> {
        const hash = Checksum256.from(username.usernameHash);
        const res = await this.contract
            .table<AppDataRaw>('appsv3', this.contractName)
            .get(hash, { index_position: 'secondary' });

        if (!res) {
            throwError(`App with username "${username.toString()}" not found`, SdkErrors.UsernameNotFound);
        }

        return res;
    }

    async getAppDataByOrigin(origin: string): Promise<AppDataRaw> {
        const originHash = sha256(origin);
        const res = await this.contract
            .table<AppDataRaw>('appsv3', this.contractName)
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

    async getAllPeople(rowsPerAPIRequest: number = 1000): Promise<PersonData[]> {
        const cursor = this.contract.table<PersonDataRaw>('people', this.contractName).query({
            rowsPerAPIRequest,
        });

        return (await cursor.all()).map(castPersonDataRaw);
    }

    async getApp(account: TonomyUsername | Name | string): Promise<AppData> {
        let appData: AppDataRaw;

        if (account instanceof TonomyUsername) {
            appData = await this.getAppDataByUsername(account);
        } else if (account instanceof Name) {
            appData = await this.getAppData(account);
        } else {
            appData = await this.getAppDataByOrigin(account);
        }

        return castAppDataRaw(appData);
    }

    async getAllApps(): Promise<AppData[]> {
        const apps = await this.getAllAppData();

        return apps.map(castAppDataRaw);
    }

    async adminCreateApp(
        appName: string,
        description: string,
        username: string,
        logoUrl: string,
        origin: string,
        backgroundColor: string,
        accentColor: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.adminCreateApp({ jsonData, username, origin });

        return transact([action], signer);
    }

    async adminUpdateApp(
        accountName: NameType,
        appName: string,
        description: string,
        username: string,
        logoUrl: string,
        origin: string,
        backgroundColor: string,
        accentColor: string,
        plan: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const jsonData = createAppJsonDataString(appName, description, logoUrl, backgroundColor, accentColor);
        const action = this.actions.adminUpdateApp({
            accountName,
            jsonData,
            username,
            origin,
            plan,
        });

        return transact([action], signer);
    }

    async adminDeleteApp(accountName: NameType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.adminDeleteApp({ accountName });

        return transact([action], signer);
    }

    async adminMigrateApp(
        accountName: NameType,
        username: string,
        plan: number,
        key: PublicKeyType,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.adminMigrateApp({ accountName, username, plan, key });

        return transact([action], signer);
    }

    async adminMigrateSc(
        accountName: NameType,
        sourceCodeUrl: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.adminMigrateSc({ accountName, sourceCodeUrl });

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
