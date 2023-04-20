import { API, Checksum256, Name, PublicKey } from '@greymass/eosio';
import { TonomyUsername } from '../username';
import { Signer } from '../eosio/transaction';
declare type GetPersonResponse = {
    account_name: Name;
    status: number;
    username_hash: Checksum256;
    password_salt: Checksum256;
    version: number;
};
declare type AppTableRecord = {
    account_name: Name;
    app_name: string;
    username_hash: Checksum256;
    description: string;
    logo_url: string;
    origin: string;
    version: number;
};
declare class IDContract {
    static singletonInstance: IDContract;
    static get Instance(): IDContract;
    newperson(username_hash: string, password_key: string, password_salt: string, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    updatekeysper(account: string, keys: {
        FINGERPRINT?: string;
        PIN?: string;
        LOCAL?: string;
    }, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    newapp(app_name: string, description: string, username_hash: string, logo_url: string, origin: string, key: PublicKey, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    loginwithapp(account: string, app: string, parent: string, key: PublicKey, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    getPerson(account: TonomyUsername | Name): Promise<GetPersonResponse>;
    getApp(account: TonomyUsername | Name | string): Promise<AppTableRecord>;
}
export { IDContract, GetPersonResponse };
