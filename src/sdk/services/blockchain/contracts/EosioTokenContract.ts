/* eslint-disable camelcase */
import { API, Name, NameType, Action } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { getSettings } from '../../../util';
import Decimal from 'decimal.js';
import Debug from 'debug';
import { Contract } from './Contract';

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
    static singletonInstande: EosioTokenContract;
    contractName: NameType = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    constructor(contractName: NameType = CONTRACT_NAME) {
        super(contractName);
        this.contractName = contractName;
    }

    static TOTAL_SUPPLY = 50000000000.0;

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

    async issueAction(to: NameType, quantity: string): Promise<Action> {
        return this.action('issue', {
            to,
            quantity,
            memo: 'issued',
        });
    }

    async issue(to: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.issueAction(to, quantity)];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async transfer(
        from: NameType,
        to: NameType,
        quantity: string,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [await this.transferAction(from, to, quantity, memo)];

        return await transact(Name.from(this.contractName), actions, signer);
    }

    async transferAction(from: NameType, to: NameType, quantity: string, memo: string): Promise<Action> {
        return this.action('transfer', { from, to, quantity, memo }, [
            { actor: from.toString(), permission: 'active' },
        ]);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(CONTRACT_NAME, account, getSettings().currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }

    async getBalanceDecimal(account: NameType): Promise<Decimal> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(CONTRACT_NAME, account, getSettings().currencySymbol);

        if (assets.length === 0) return new Decimal(0);
        return new Decimal(assets[0].quantity);
    }
}

const eosioTokenContract = new EosioTokenContract();

export function createEosioTokenContract(contract: NameType): EosioTokenContract {
    return new EosioTokenContract(contract);
}

export { EosioTokenContract, eosioTokenContract };
export default eosioTokenContract;
