/* eslint-disable camelcase */
import { Checksum256, Name, PrivateKey, PublicKey } from '@wharfkit/antelope';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { createSigner } from '../services/blockchain/eosio/transaction';
import { getSettings } from '../util/settings';
import { AccountType, TonomyUsername } from '../util/username';

const idContract = IDContract.Instance;

enum AppStatus {
    PENDING = 'PENDING',
    CREATING = 'CREATING',
    READY = 'READY',
    DEACTIVATED = 'DEACTIVATED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace AppStatus {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: AppStatus): number {
        return Object.keys(AppStatus).indexOf(value);
    }

    /*
     * Creates an AppStatus from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): AppStatus {
        let index: number;

        if (typeof value !== 'number') {
            index = AppStatus.indexFor(value as AppStatus);
        } else {
            index = value;
        }

        return Object.values(AppStatus)[index] as AppStatus;
    }
}

export { AppStatus };

export interface AppData {
    accountName: Name;
    appName: string;
    usernameHash: Checksum256;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatus;
}

type AppConstructor = Omit<AppData, 'usernameHash'> & { username?: TonomyUsername; usernameHash?: Checksum256 };

export type AppCreateOptions = {
    usernamePrefix: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    publicKey: PublicKey;
};

export class App implements AppData {
    accountName: Name;
    appName: string;
    username?: TonomyUsername;
    usernameHash: Checksum256;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatus;

    constructor(options: AppConstructor) {
        this.accountName = options.accountName;
        this.appName = options.appName;
        this.username = options.username;
        this.description = options.description;
        this.logoUrl = options.logoUrl;
        this.origin = options.origin;
        this.version = options.version;
        this.status = options.status;

        if (options.usernameHash) {
            this.usernameHash = options.usernameHash;
        } else if (options.username) {
            this.usernameHash = Checksum256.from(options.username.usernameHash);
        } else {
            throw new Error('Either username or usernameHash must be provided');
        }
    }

    static async create(options: AppCreateOptions): Promise<App> {
        const username = TonomyUsername.fromUsername(
            options.usernamePrefix,
            AccountType.APP,
            getSettings().accountSuffix
        );

        // TODO remove this
        const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');

        const res = await idContract.newapp(
            options.appName,
            options.description,
            username.usernameHash,
            options.logoUrl,
            options.origin,
            options.publicKey,
            createSigner(privateKey)
        );

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        return new App({
            ...options,
            accountName: Name.from(newAccountAction.data.name),
            username,
            version: newAccountAction.data.version,
            status: AppStatus.READY,
        });
    }

    static async getApp(origin: string): Promise<App> {
        const contractAppData = await idContract.getApp(origin);

        return new App({
            accountName: contractAppData.account_name,
            appName: contractAppData.app_name,
            usernameHash: contractAppData.username_hash,
            description: contractAppData.description,
            logoUrl: contractAppData.logo_url,
            origin: contractAppData.origin,
            version: contractAppData.version,
            status: AppStatus.READY,
        });
    }
}