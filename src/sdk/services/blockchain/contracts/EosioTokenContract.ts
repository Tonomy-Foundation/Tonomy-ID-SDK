/* eslint-disable camelcase */
import { API, Name, NameType, Action, AssetType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { getSettings } from '../../../util';
import Decimal from 'decimal.js';
import Debug from 'debug';
import { Contract, loadContract } from './Contract';
import { ActionOptions, Contract as AntelopeContract } from '@wharfkit/contract';

const debug = Debug('tonomy-id-sdk:services:blockchain:contracts:token');

const CONTRACT_NAME = 'eosio.token';

function assetToNumberString(asset: string, symbol?: string): string {
    if (!symbol) {
        symbol = getSettings().currencySymbol;
    }

    const [res, currency] = asset.split(' ');

    if (currency !== symbol) {
        debug(`Invalid currency symbol: expected ${symbol}, for asset ${asset}`);
        throw new Error(`Invalid currency symbol: expected ${symbol}, got ${currency}`);
    }

    return res;
}

// FIXME: Remove use of this function. We should never use a number to represent tokens as they are not precise and cannot handle large numbers.
/**
 * @deprecated use assetToDecimal instead
 */
export function assetToAmount(asset: string): number {
    return parseFloat(assetToNumberString(asset));
}

export function assetToDecimal(asset: string): Decimal {
    return new Decimal(assetToNumberString(asset));
}

/**
 * @deprecated
 * see FIXME above
 */
export function amountToAsset(amount: number, symbol: string, precision = 6): string {
    return amount.toFixed(precision) + ' ' + symbol;
}

export function amountToSupplyPercentage(amount: Decimal): string {
    return amount.mul(100).div(EosioTokenContract.TOTAL_SUPPLY).toFixed(8) + '%';
}

export class EosioTokenContract extends Contract {
    constructor(contract: AntelopeContract) {
        super(contract);
    }

    static async atAccount(account: NameType = CONTRACT_NAME): Promise<EosioTokenContract> {
        return new this(await loadContract(account));
    }

    static TOTAL_SUPPLY = 50000000000.0;

    actions = {
        create: (data: { issuer: NameType; maximumSupply: AssetType }, authorization?: ActionOptions) =>
            this.action('create', { issuer: data.issuer, maximum_supply: data.maximumSupply }, authorization),
        issue: (data: { to: NameType; quantity: AssetType; memo?: string }, authorization?: ActionOptions) => {
            if (!authorization) authorization = { authorization: [{ actor: data.to, permission: 'active' }] };
            if (!data.memo) data.memo = '';
            return this.action('issue', data, authorization);
        },
        transfer: (
            data: { from: NameType; to: NameType; quantity: AssetType; memo?: string },
            authorization?: ActionOptions
        ) => {
            if (!authorization) authorization = { authorization: [{ actor: data.from, permission: 'active' }] };
            if (!data.memo) data.memo = '';
            return this.action('transfer', data, authorization);
        },
    };

    async create(issuer: NameType, maximumSupply: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.actions.create({ issuer, maximumSupply })];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async issue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.actions.issue({ to, quantity, memo })];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async transfer(
        from: NameType,
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.actions.transfer({ from, to, quantity, memo })];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    /**
     * @deprecated use getBalanceDecimal instead
     */
    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(this.contractName, account, getSettings().currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }

    async getBalanceDecimal(account: NameType): Promise<Decimal> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(this.contractName, account, getSettings().currencySymbol);

        if (assets.length === 0) return new Decimal(0);

        return assetToDecimal(assets[0].toString());
    }
}

export async function loadEosioTokenContract(): Promise<EosioTokenContract> {
    return await EosioTokenContract.atAccount();
}
