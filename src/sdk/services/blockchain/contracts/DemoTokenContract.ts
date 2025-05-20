import { API, Name, NameType, AssetType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { AccountType, TonomyUsername, getSettings } from '../../../util';
import { Contract, loadContract } from './Contract';
import { ActionOptions, Contract as AntelopeContract } from '@wharfkit/contract';
import { TonomyContract } from './TonomyContract';

export class DemoTokenContract extends Contract {
    constructor(contract: AntelopeContract) {
        super(contract);
    }

    static async atAccount(account?: NameType): Promise<DemoTokenContract> {
        return new this(await loadContract(await this.getContractName(account)));
    }

    static async getContractName(account?: NameType): Promise<NameType> {
        if (account) return account;

        const username = TonomyUsername.fromUsername('demo', AccountType.APP, getSettings().accountSuffix);
        const app = await TonomyContract.Instance.getApp(username);

        return Name.from(app.account_name);
    }

    actions = {
        create: (data: { supply: AssetType }, authorization?: ActionOptions) =>
            this.action('create', data, authorization),
        issue: (data: { issuer: NameType; quantity: AssetType; memo?: string }, authorization?: ActionOptions) => {
            if (!authorization) authorization = { authorization: [{ actor: data.issuer, permission: 'active' }] };
            if (!data.memo) data.memo = '';
            return this.action('issue', data, authorization);
        },
        selfIssue: (data: { to: NameType; quantity: AssetType; memo?: string }, authorization?: ActionOptions) => {
            if (!authorization) authorization = { authorization: [{ actor: data.to, permission: 'active' }] };
            if (!data.memo) data.memo = '';
            return this.action('selfissue', data, authorization);
        },
    };

    async create(supply: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.create({ supply })];

        return await transact(this.contractName, actions, signer);
    }

    async issue(
        issuer: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.issue({ issuer, quantity, memo })];

        return await transact(this.contractName, actions, signer);
    }

    async selfIssue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.selfIssue({ to, quantity, memo })];

        return await transact(this.contractName, actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(await this.contractName, account, getSettings().currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

export default async function loadDemoTokenContract(): Promise<DemoTokenContract> {
    return await DemoTokenContract.atAccount();
}
