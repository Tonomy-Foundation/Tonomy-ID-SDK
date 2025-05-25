import { API, Name, NameType, AssetType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { AccountType, TonomyUsername, getSettings } from '../../../util';
import { Contract, loadContract } from './Contract';
import { ActionOptions } from '@wharfkit/contract';
import { TonomyContract } from './TonomyContract';
import { activeAuthority } from '../eosio/authority';

export class DemoTokenContract extends Contract {
    static async atAccount(account?: NameType): Promise<DemoTokenContract> {
        return new this(await loadContract(await this.getContractName(account)));
    }

    static async getContractName(account?: NameType): Promise<NameType> {
        if (account) return account;

        const username = TonomyUsername.fromUsername('demo', AccountType.APP, getSettings().accountSuffix);
        const app = await TonomyContract.Instance.getApp(username);

        return Name.from(app.account_name);
    }

    // action getters. add default authorization and values, use camelCase for variables and action names
    actions = {
        create: (data: { supply: AssetType }, authorization?: ActionOptions) =>
            this.action('create', data, authorization),
        issue: (
            { issuer, quantity, memo = '' }: { issuer: NameType; quantity: AssetType; memo?: string },
            authorization?: ActionOptions
        ) => this.action('issue', { issuer, quantity, memo }, authorization),
        selfIssue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo?: string },
            authorization: ActionOptions = activeAuthority(to)
        ) => this.action('selfissue', { to, quantity, memo }, authorization),
    };

    async create(supply: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.create({ supply })];

        return await transact(actions, signer);
    }

    async issue(
        issuer: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.issue({ issuer, quantity, memo })];

        return await transact(actions, signer);
    }

    async selfIssue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.selfIssue({ to, quantity, memo })];

        return await transact(actions, signer);
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
