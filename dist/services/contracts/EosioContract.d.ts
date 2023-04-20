import { API, Name } from '@greymass/eosio';
import { Authority } from '../eosio/authority';
import { Signer } from '../eosio/transaction';
declare class EosioContract {
    static singletonInstance: EosioContract;
    static get Instance(): EosioContract;
    /**
     * Deploys a contract at the specified address
     *
     * @param account - Account where the contract will be deployed
     * @param wasmFileContents - wasmFile after reading with fs.readFileSync(path) or equivalent
     * @param abiFileContents - abiFile after reading with fs.readFileSync(path, `utf8`) or equivalent
     */
    deployContract(account: Name, wasmFileContent: any, abiFileContent: any, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    newaccount(creator: string, account: string, owner: Authority, active: Authority, signer: Signer): Promise<API.v1.PushTransactionResponse>;
    updateauth(account: string, permission: string, parent: string, auth: Authority, signer: Signer): Promise<API.v1.PushTransactionResponse>;
}
export { EosioContract };
