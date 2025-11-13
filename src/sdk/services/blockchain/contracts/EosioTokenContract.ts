/* eslint-disable camelcase */
import { API, NameType, AssetType } from '@wharfkit/antelope';
import { ActionOptions, Contract as AntelopeContract } from '@wharfkit/contract';
import Decimal from 'decimal.js';
import { Contract, loadContract } from './Contract';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { getSettings, isProduction } from '../../../util/settings';
import { activeAuthority } from '../eosio/authority';
import abi from './abi/eosio.token.abi.json';

const CONTRACT_NAME = 'eosio.token';

function assetToNumberString(asset: string, symbol?: string): string {
    const currencySymbol = symbol || getSettings().currencySymbol;

    const [res, currency] = asset.split(' ');

    if (currency !== currencySymbol) {
        throw new Error(`Invalid currency symbol: expected ${currencySymbol}, got ${currency}`);
    }

    return res;
}

// FIXME: Remove use of this function. We should never use a number to represent tokens as they are not precise and cannot handle large numbers.
/**
 * @deprecated use assetToDecimal instead
 */
export function assetToAmount(asset: string, symbol?: string): number {
    return parseFloat(assetToNumberString(asset, symbol));
}

export function assetToDecimal(asset: string, symbol?: string): Decimal {
    return new Decimal(assetToNumberString(asset, symbol));
}

/** Convert a number to an EOSIO asset string
 *
 * @deprecated remove use of number to represent tokens. Use Decimal/BigInt instead
 * see FIXME above
 */
export function amountToAsset(amount: number, symbol: string, precision = 6): string {
    return amount.toFixed(precision) + ' ' + symbol;
}

export function decimalToAsset(amount: Decimal, symbol = getSettings().currencySymbol, precision = 6): string {
    return amount.toFixed(precision) + ' ' + symbol;
}

export function amountToSupplyPercentage(amount: Decimal): string {
    return amount.mul(100).div(EosioTokenContract.TOTAL_SUPPLY).toFixed(8) + '%';
}

export class EosioTokenContract extends Contract {
    // TODO: should move this out of the class, as this only applies to the TONO token
    static TOTAL_SUPPLY = 50000000000.0;

    static async atAccount(account: NameType = CONTRACT_NAME): Promise<EosioTokenContract> {
        return new this(await loadContract(account));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): EosioTokenContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, isProduction());
    }

    // action getters. add default authorization and values, use camelCase for variables and action names
    actions = {
        create: (
            data: { issuer: NameType; maximumSupply: AssetType },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ) => this.action('create', { issuer: data.issuer, maximum_supply: data.maximumSupply }, authorization),
        issue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ) => this.action('issue', { to, quantity, memo }, authorization),
        retire: (
            { quantity, memo = '' }: { quantity: AssetType; memo: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ) => this.action('retire', { quantity, memo }, authorization),
        transfer: (
            { from, to, quantity, memo = '' }: { from: NameType; to: NameType; quantity: AssetType; memo?: string },
            authorization: ActionOptions = activeAuthority(from)
        ) => this.action('transfer', { from, to, quantity, memo }, authorization),
        setStats: (data: object, authorization: ActionOptions = activeAuthority(this.contractName)) =>
            this.action('setstats', data, authorization),
        bridgeIssue: (
            { to, quantity, memo = '' }: { to: NameType; quantity: AssetType; memo: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ) => this.action('bridgeissue', { to, quantity, memo }, authorization),
        bridgeRetire: (
            { from, quantity, memo = '' }: { from: NameType; quantity: AssetType; memo: string },
            authorization: ActionOptions = activeAuthority(this.contractName)
        ) => this.action('bridgeretire', { from, quantity, memo }, authorization),
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

    async transfer(
        from: NameType,
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.transfer({ from, to, quantity, memo });

        return await transact(action, signer);
    }

    async retire(quantity: AssetType, memo: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.retire({ quantity, memo });

        return await transact(action, signer);
    }

    async bridgeIssue(
        to: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.bridgeIssue({ to, quantity, memo });

        return await transact(action, signer);
    }

    async bridgeRetire(
        from: NameType,
        quantity: AssetType,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.bridgeRetire({ from, quantity, memo });

        return await transact(action, signer);
    }

    /**
     * @deprecated use getBalanceDecimal instead
     */
    async getBalance(account: NameType, symbol?: string): Promise<number> {
        const currencySymbol = symbol || getSettings().currencySymbol;
        const assets = await getApi().v1.chain.get_currency_balance(this.contractName, account, currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }

    async getBalanceDecimal(account: NameType, symbol?: string): Promise<Decimal> {
        const currencySymbol = symbol || getSettings().currencySymbol;
        const assets = await getApi().v1.chain.get_currency_balance(this.contractName, account, currencySymbol);

        if (assets.length === 0) return new Decimal(0);

        return assetToDecimal(assets[0].toString(), currencySymbol);
    }
}

let tonomyContract: EosioTokenContract | undefined;

export const getTokenContract = () => {
    if (!tonomyContract) {
        tonomyContract = EosioTokenContract.fromAbi(abi);
    }

    return tonomyContract;
};
