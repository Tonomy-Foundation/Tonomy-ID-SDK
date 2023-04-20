import { API } from '@greymass/eosio';
import { Signer } from '../eosio/transaction';
declare class EosioTokenContract {
    static singletonInstande: EosioTokenContract;
    static get Instance(): EosioTokenContract;
    create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse>;
}
export { EosioTokenContract };
