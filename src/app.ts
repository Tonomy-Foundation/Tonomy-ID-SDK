/* eslint-disable camelcase */
import { Name, PrivateKey, PublicKey } from '@greymass/eosio';
import { IDContract } from './services/contracts/IDContract';
import { createSigner } from './services/eosio/transaction';
import { getSettings } from './settings';
import { AccountType, TonomyUsername } from './services/username';

// Instance of IDContract singleton
const idContract = IDContract.Instance;

// Enum for AppStatus
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
     * @param {value} AppStatus - The level to get the index of
     * @return
     */
    export function indexFor(value: AppStatus): number {
        return Object.keys(AppStatus).indexOf(value);
    }

    /*
     * Creates an AppStatus from a string or index of the level
     *
     * @param {value} number| string - The string or index
     * @return {} 
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

/**
 * Export the AppStatus enum
 */
export { AppStatus };

/**
 * Interface for App data
 */
export interface AppData {
    accountName: Name;
    appName: string;
    username: TonomyUsername;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatus;
}


/**
 * Type for AppCreateOptions
 */
export type AppCreateOptions = {
    usernamePrefix: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    publicKey: PublicKey;
};

/**
 * Class for creating and fetching App data
 */
export class App implements AppData {
    accountName: Name;
    appName: string;
    username: TonomyUsername;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatus;
    
     /**
     * Constructor for the App class
     *
     * @param {options} AppData - The options for the AppData
     */
    constructor(options: AppData) {
        this.accountName = options.accountName;
        this.appName = options.appName;
        this.username = options.username;
        this.description = options.description;
        this.logoUrl = options.logoUrl;
        this.origin = options.origin;
        this.version = options.version;
        this.status = options.status;
    }
    
    /**
     * Static method to create a new App object
     *
     * @param {options} AppCreateOptions - The options for creating the App object
     * @returns A Promise resolving to the newly created App object
     */
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

    /**
     *Static method to get an existing App object
     *
     *@param {string} origin - The origin of the app
     *@returns {Promise<App>} A Promise resolving to the retrieved App object
     */
    static async getApp(origin: string): Promise<App> {
        const contractAppData = await idContract.getApp(origin);

        return new App({
            accountName: contractAppData.account_name,
            appName: contractAppData.app_name,
            username: TonomyUsername.fromHash(contractAppData.username_hash.toString()),
            description: contractAppData.description,
            logoUrl: contractAppData.logo_url,
            origin: contractAppData.origin,
            version: contractAppData.version,
            status: AppStatus.READY,
        });
    }
}
