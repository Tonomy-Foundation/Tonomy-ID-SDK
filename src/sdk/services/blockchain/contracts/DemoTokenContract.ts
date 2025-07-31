/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { AccountType, TonomyUsername, getSettings } from '../../../util';
import { getTonomyContract } from './TonomyContract';

class DemoTokenContract {
    static singletonInstande: DemoTokenContract;
    contractName: string;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    static atAccount(account: Name): DemoTokenContract {
        const instance = new this();

        instance.contractName = account.toString();
        return instance;
    }

    async getContractName(): Promise<string> {
        if (!this.contractName) {
            const username = TonomyUsername.fromUsername('demo', AccountType.APP, getSettings().accountSuffix);
            const app = await getTonomyContract().getApp(username);

            this.contractName = app.account_name.toString();
        }

        return this.contractName;
    }

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: await this.getContractName(),
                name: 'create',
                authorization: [
                    {
                        actor: await this.getContractName(),
                        permission: 'active',
                    },
                ],
                data: {
                    issuer: await this.getContractName(),
                    maximum_supply: supply,
                },
            },
        ];

        return await transact(Name.from(await this.getContractName()), actions, signer);
    }

    async issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: await this.getContractName(),
                name: 'issue',
                authorization: [
                    {
                        actor: await this.getContractName(),
                        permission: 'active',
                    },
                ],
                data: {
                    to: await this.getContractName(),
                    quantity,
                    memo: 'issued',
                },
            },
        ];

        return await transact(Name.from(await this.getContractName()), actions, signer);
    }

    async selfIssue(to: Name, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: await this.getContractName(),
                name: 'issue',
                authorization: [
                    {
                        actor: await this.getContractName(),
                        permission: 'active',
                    },
                ],
                data: {
                    to,
                    quantity,
                    memo: 'self issued',
                },
            },
        ];

        return await transact(Name.from(await this.getContractName()), actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (
            await getApi()
        ).v1.chain.get_currency_balance(await this.getContractName(), account, getSettings().currencySymbol);

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

export { DemoTokenContract };
