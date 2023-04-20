import { Name, PublicKey } from '@greymass/eosio';
import { TonomyUsername } from './services/username';
declare enum AppStatus {
    PENDING = "PENDING",
    CREATING = "CREATING",
    READY = "READY",
    DEACTIVATED = "DEACTIVATED"
}
declare namespace AppStatus {
    function indexFor(value: AppStatus): number;
    function from(value: number | string): AppStatus;
}
export { AppStatus };
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
export declare type AppCreateOptions = {
    usernamePrefix: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    publicKey: PublicKey;
};
export declare class App implements AppData {
    accountName: Name;
    appName: string;
    username: TonomyUsername;
    description: string;
    logoUrl: string;
    origin: string;
    version: number;
    status: AppStatus;
    constructor(options: AppData);
    static create(options: AppCreateOptions): Promise<App>;
    static getApp(origin: string): Promise<App>;
}
