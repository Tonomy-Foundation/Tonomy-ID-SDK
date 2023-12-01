/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';

class EosioTokenContract {
    static singletonInstande: EosioTokenContract;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'demo.tmy',
                name: 'create',
                authorization: [
                    {
                        actor: 'demo.tmy',
                        permission: 'active',
                    },
                ],
                data: {
                    issuer: 'demo.tmy',
                    maximum_supply: supply,
                },
            },
        ];

        return await transact(Name.from('demo.tmy'), actions, signer);
    }

    async issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'demo.tmy',
                name: 'issue',
                authorization: [
                    {
                        actor: 'demo.tmy',
                        permission: 'active',
                    },
                ],
                data: {
                    to: 'demo.tmy',
                    quantity,
                    memo: 'issued',
                },
            },
        ];

        return await transact(Name.from('demo.tmy'), actions, signer);
    }

    async selfIssue(to: Name, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'demo.tmy',
                name: 'issue',
                authorization: [
                    {
                        actor: 'demo.tmy',
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

        return await transact(Name.from('demo.tmy'), actions, signer);
    }

    async addPerm(permission: NameType, signer: Signer) {
        const actions = [
            {
                account: 'demo.tmy',
                name: 'addperm',
                authorization: [
                    {
                        actor: 'demo.tmy',
                        permission: 'active',
                    },
                ],
                data: {
                    per: permission,
                },
            },
        ];

        await transact(Name.from('demo.tmy'), actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (await getApi()).v1.chain.get_currency_balance('demo.tmy', account, 'SYS');

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

export { EosioTokenContract };
