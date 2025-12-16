import { Name, PublicKey } from '@wharfkit/antelope';
import { Signer } from '../services/blockchain/eosio/transaction';
import { getSettings } from '../util/settings';
import { AccountType, TonomyUsername } from '../util/username';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { getTonomyContract, AppData, AppPlan } from '../services/blockchain';
import { parseDid } from '../util/ssi/did';
import { SdkErrors, throwError } from '../util/errors';

// Extended AppData with status field for controller use
export interface AppDataExtended extends AppData {
    status: AppStatusEnum;
}

type AppConstructor = Omit<AppDataExtended, 'username'> & { username?: TonomyUsername };

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

export class App implements AppDataExtended {
    accountName: Name;
    appName: string;
    username: string;
    tonomyUsername?: TonomyUsername;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatusEnum;
    accentColor: string;
    backgroundColor: string;
    plan: AppPlan;
    jsonData: string;

    constructor(options: AppConstructor) {
        this.accountName = options.accountName;
        this.appName = options.appName;
        this.tonomyUsername = options.username;
        this.username = options.username ? options.username.toString() : options.username;
        this.description = options.description;
        this.logoUrl = options.logoUrl;
        this.origin = options.origin;
        this.version = options.version;
        this.status = options.status;
        this.accentColor = options.accentColor;
        this.backgroundColor = options.backgroundColor;
        this.plan = options.plan;
        this.jsonData = options.jsonData;
    }

    static async create(options: AppCreateOptions): Promise<App> {
        const username = TonomyUsername.fromUsername(
            options.usernamePrefix,
            AccountType.APP,
            getSettings().accountSuffix
        );

        const res = await getTonomyContract().appCreate(
            username.getBaseUsername(),
            options.appName,
            options.description,
            username.toString(),
            options.logoUrl,
            options.origin,
            options.backgroundColor,
            options.accentColor,
            options.signer
        );

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        return new App({
            ...options,
            accountName: Name.from(newAccountAction.data.name),
            username,
            version: 3,
            status: AppStatusEnum.READY,
            plan: AppPlan.BASIC,
            jsonData: '',
        });
    }

    static async getApp(origin: string): Promise<App> {
        const contractAppData = await getTonomyContract().getApp(origin);

        return new App({
            accountName: contractAppData.accountName,
            appName: contractAppData.appName,
            username: undefined,
            description: contractAppData.description,
            logoUrl: contractAppData.logoUrl,
            origin: contractAppData.origin,
            version: contractAppData.version,
            status: AppStatusEnum.READY,
            accentColor: contractAppData.accentColor,
            backgroundColor: contractAppData.backgroundColor,
            plan: contractAppData.plan,
            jsonData: contractAppData.jsonData,
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
