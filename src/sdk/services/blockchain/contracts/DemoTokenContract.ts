/* eslint-disable camelcase */
import { API, Name, NameType, Action } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { AccountType, TonomyUsername, getSettings } from '../../../util';
import { TonomyContract } from './TonomyContract';
import { Contract } from './Contract';

const tonomyContract = TonomyContract.Instance;

export class DemoTokenContract extends Contract {
    static singletonInstande: DemoTokenContract;
    contractName?: NameType;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    constructor(contractName?: NameType) {
        super(contractName);

        if (contractName) {
            this.contractName = contractName;
        }
    }

    static atAccount(account: NameType): DemoTokenContract {
        return new DemoTokenContract(account);
    }

    async getContractName(): Promise<string> {
        if (!this.contractName) {
            const username = TonomyUsername.fromUsername('demo', AccountType.APP, getSettings().accountSuffix);
            const app = await tonomyContract.getApp(username);

            this.contractName = app.account_name;
        }

        return this.contractName.toString();
    }

    async createAction(supply: string): Promise<Action> {
        return this.action('create', {
            issuer: this.contractName,
            maximum_supply: supply,
        });
    }

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.createAction(supply)];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async issueAction(quantity: string): Promise<Action> {
        return this.action('issue', {
            to: this.contractName,
            quantity,
            memo: 'issued',
        });
    }

    async issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.issueAction(quantity)];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async selfIssueAction(to: NameType, quantity: string): Promise<Action> {
        return this.action('selfissue', {
            to,
            quantity,
            memo: 'self issued',
        });
    }

    async selfIssue(to: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.selfIssueAction(to, quantity)];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(await this.getContractName(), account, getSettings().currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

const demoTokenContract = new DemoTokenContract();

export function createDemoTokenContract(contract: NameType): DemoTokenContract {
    return new DemoTokenContract(contract);
}

export { DemoTokenContract, demoTokenContract };
export default demoTokenContract;
