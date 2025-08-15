import { Checksum256, Name, PublicKey } from '@wharfkit/antelope';
import { Signer } from '../services/blockchain/eosio/transaction';
import { getSettings } from '../util/settings';
import { AccountType, TonomyUsername } from '../util/username';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { getTonomyContract } from '../services/blockchain';
import { parseDid, SdkErrors, throwError } from '../util';

export interface AppData {
    accountName: Name;
    appName: string;
    usernameHash: Checksum256;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatusEnum;
    accentColor: string;
    backgroundColor: string;
}

type AppConstructor = Omit<AppData, 'usernameHash'> & { username?: TonomyUsername; usernameHash?: Checksum256 };

export type AppCreateOptions = {
    usernamePrefix: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    backgroundColor: string;
    accentColor: string;
    publicKey: PublicKey;
    signer: Signer;
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
    accentColor: string;
    backgroundColor: string;

    constructor(options: AppConstructor) {
        this.accountName = options.accountName;
        this.appName = options.appName;
        this.username = options.username;
        this.description = options.description;
        this.logoUrl = options.logoUrl;
        this.origin = options.origin;
        this.version = options.version;
        this.status = options.status;
        this.accentColor = options.accentColor;
        this.backgroundColor = options.backgroundColor;

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

        const res = await getTonomyContract().newApp(
            options.appName,
            options.description,
            username.usernameHash,
            options.logoUrl,
            options.origin,
            options.backgroundColor,
            options.accentColor,
            options.publicKey,
            options.signer
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
        const contractAppData = await getTonomyContract().getApp(origin);

        return new App({
            accountName: contractAppData.accountName,
            appName: contractAppData.appName,
            usernameHash: contractAppData.usernameHash,
            description: contractAppData.description,
            logoUrl: contractAppData.logoUrl,
            origin: contractAppData.origin,
            version: contractAppData.version,
            status: AppStatusEnum.READY,
            accentColor: contractAppData.accentColor,
            backgroundColor: contractAppData.backgroundColor,
        });
    }
}

export async function checkOriginMatchesApp(
    vcId: string,
    did: string,
    verifyOrigin: boolean = true
): Promise<{ origin: string; app: App } | undefined> {
    if (verifyOrigin) {
        const origin = vcId?.split('/vc/auth/')[0];

        if (!origin) throwError('Invalid origin', SdkErrors.InvalidData);
        const app = await App.getApp(origin);
        const { fragment } = parseDid(did);

        if (fragment !== app.accountName.toString()) throwError('Invalid app', SdkErrors.InvalidData);

        return { origin, app };
    }

    return;
}
