/* eslint-disable camelcase */
import { API, NameType, AssetType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { AccountType, TonomyUsername, getSettings } from '../../../util';
import { Contract, loadContract } from './Contract';
import { ActionOptions } from '@wharfkit/contract';
import { getTonomyContract } from './TonomyContract';
import { activeAuthority } from '../eosio/authority';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:blockchain:contracts:DemoTokenContract');

export class DemoTokenContract extends Contract {
    static async atAccount(account?: NameType): Promise<DemoTokenContract> {
        return new this(await loadContract(await this.getContractName(account)));
    }

    static async getContractName(account?: NameType): Promise<NameType> {
        if (account) return account;

        const username = TonomyUsername.fromUsername('demo', AccountType.APP, getSettings().accountSuffix);
        const app = await getTonomyContract().getApp(username);

        debug('demo contract found', app.accountName.toString());

        return app.accountName;
    }

    // action getters. add default authorization and values, use camelCase for variables and action names
    actions = {
        create: (data: { issuer: NameType; maximumSupply: AssetType }, authorization?: ActionOptions) =>
            this.action('create', { issuer: data.issuer, maximum_supply: data.maximumSupply }, authorization),
        issue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo?: string },
            authorization?: ActionOptions
        ) => this.action('issue', { to, quantity, memo }, authorization),
        selfIssue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo?: string },
            authorization: ActionOptions = activeAuthority(to)
        ) => this.action('selfissue', { to, quantity, memo }, authorization),
    };

    async create(issuer: NameType, maximumSupply: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.create({ issuer, maximumSupply });

        return await transact(action, signer);
    }

    async issue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.issue({ to, quantity, memo });

        return await transact(action, signer);
    }

    async selfIssue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.selfIssue({ to, quantity, memo });

        return await transact(action, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await getApi().v1.chain.get_currency_balance(
            this.contractName,
            account,
            getSettings().currencySymbol
        );

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

export default async function loadDemoTokenContract(): Promise<DemoTokenContract> {
    return await DemoTokenContract.atAccount();
}
