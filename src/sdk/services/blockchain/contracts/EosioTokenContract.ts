/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { getSettings } from '../../../util';
import Decimal from 'decimal.js';

const CONTRACT_NAME = 'eosio.token';

function assetToNumberString(asset: string): string {
    return asset.split(' ')[0];
}

export function assetToAmount(asset: string): number {
    return parseFloat(assetToNumberString(asset));
}

export function assetToDecimal(asset: string): Decimal {
    return new Decimal(assetToNumberString(asset));
}

export function amountToAsset(amount: number, symbol: string, precision = 6): string {
    return amount.toFixed(precision) + ' ' + symbol;
}

export function amountToSupplyPercentage(amount: Decimal): string {
    return amount.mul(100).div(EosioTokenContract.TOTAL_SUPPLY).toFixed(8) + '%';
}

class EosioTokenContract {
    static singletonInstande: EosioTokenContract;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    static TOTAL_SUPPLY = 50000000000.0;

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'create',
                authorization: [
                    {
                        actor: CONTRACT_NAME,
                        permission: 'active',
                    },
                ],
                data: {
                    issuer: CONTRACT_NAME,
                    maximum_supply: supply,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async issue(to: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'issue',
                authorization: [
                    {
                        actor: CONTRACT_NAME,
                        permission: 'active',
                    },
                ],
                data: {
                    to,
                    quantity,
                    memo: 'issued',
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async transfer(
        from: NameType,
        to: NameType,
        quantity: string,
        memo: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'transfer',
                authorization: [
                    {
                        actor: from.toString(),
                        permission: 'active',
                    },
                ],
                data: {
                    from,
                    to,
                    quantity,
                    memo,
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(CONTRACT_NAME, account, getSettings().currencySymbol);

        console.log(account.toString(), assets);
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

export { EosioTokenContract };
