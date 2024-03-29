/* eslint-disable camelcase */
import { Checksum256, Name, PublicKey } from '@wharfkit/antelope';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { createSigner } from '../services/blockchain/eosio/transaction';
import { getSettings } from '../util/settings';
import { AccountType, TonomyUsername } from '../util/username';
import { defaultAntelopePrivateKey } from '../services/blockchain';
import { AppStatusEnum } from '../types/AppStatusEnum';

const idContract = IDContract.Instance;

export interface AppData {
    accountName: Name;
    appName: string;
    usernameHash: Checksum256;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatusEnum;
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
    status: AppStatusEnum;

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
        const privateKey = defaultAntelopePrivateKey;

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
            status: AppStatusEnum.READY,
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
            status: AppStatusEnum.READY,
        });
    }
}
