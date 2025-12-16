import { Name, NameType, PublicKey } from '@wharfkit/antelope';
import { Signer } from '../services/blockchain/eosio/transaction';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { getTonomyContract, AppData, AppPlan } from '../services/blockchain';
import { parseDid } from '../util/ssi/did';
import { SdkErrors, throwError } from '../util/errors';

// Extended AppData with status field for controller use
export interface AppDataExtended extends AppData {
    status: AppStatusEnum;
}

export type AppCreateOptions = {
    creator: NameType;
    username: string;
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
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatusEnum;
    accentColor: string;
    backgroundColor: string;
    plan: AppPlan;
    jsonData: string;

    constructor(options: AppDataExtended) {
        this.username = options.username;
        this.accountName = options.accountName;
        this.appName = options.appName;
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
        const res = await getTonomyContract().appCreate(
            options.creator,
            options.appName,
            options.description,
            options.username,
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
            username: options.username,
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
            username: contractAppData.username,
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
