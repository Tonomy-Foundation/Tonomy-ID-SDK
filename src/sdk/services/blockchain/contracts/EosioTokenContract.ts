/* eslint-disable camelcase */
import { API, NameType, AssetType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { getSettings } from '../../../util';
import Decimal from 'decimal.js';
import Debug from 'debug';
import { Contract, loadContract } from './Contract';
import { ActionOptions, Contract as AntelopeContract } from '@wharfkit/contract';
import { activeAuthority } from '../eosio/authority';
import abi from '../../../../../Tonomy-Contracts/contracts/eosio.token/eosio.token.abi.json';

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
    static TOTAL_SUPPLY = 50000000000.0;

    static async atAccount(account: NameType = CONTRACT_NAME): Promise<EosioTokenContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): EosioTokenContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, false);
    }

    // action getters. add default authorization and values, use camelCase for variables and action names
    actions = {
        create: (data: { issuer: NameType; maximumSupply: AssetType }, authorization?: ActionOptions) =>
            this.action('create', { issuer: data.issuer, maximum_supply: data.maximumSupply }, authorization),
        issue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo: string },
            authorization?: ActionOptions
        ) => this.action('issue', { to, quantity, memo }, authorization),
        transfer: (
            { from, to, quantity, memo = '' }: { from: NameType; to: NameType; quantity: AssetType; memo?: string },
            authorization: ActionOptions = activeAuthority(from)
        ) => this.action('transfer', { from, to, quantity, memo }, authorization),
    };

    async create(issuer: NameType, maximumSupply: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.create({ issuer, maximumSupply })];

        return await transact(actions, signer);
    }

    async issue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.issue({ to, quantity, memo })];

        return await transact(actions, signer);
    }

    async transfer(
        from: NameType,
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [this.actions.transfer({ from, to, quantity, memo })];

        return await transact(actions, signer);
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

export const tokenContract = EosioTokenContract.fromAbi(abi);

export default async function loadTokenContract(): Promise<EosioTokenContract> {
    return await EosioTokenContract.atAccount();
}
