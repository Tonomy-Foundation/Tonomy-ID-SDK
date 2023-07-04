/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';

class EosioTokenContract {
    static singletonInstande: EosioTokenContract;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'eosio.token',
                name: 'create',
                authorization: [
                    {
                        actor: 'eosio.token',
                        permission: 'active',
                    },
                ],
                data: {
                    issuer: 'eosio.token',
                    maximum_supply: supply,
                },
            },
        ];

        return await transact(Name.from('eosio.token'), actions, signer);
    }

    async issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'eosio.token',
                name: 'issue',
                authorization: [
                    {
                        actor: 'eosio.token',
                        permission: 'active',
                    },
                ],
                data: {
                    to: 'eosio.token',
                    quantity,
                    memo: 'issued',
                },
            },
        ];

        return await transact(Name.from('eosio.token'), actions, signer);
    }

    async selfIssue(to: Name, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const actions = [
            {
                account: 'eosio.token',
                name: 'issue',
                authorization: [
                    {
                        actor: 'eosio.token',
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

        return await transact(Name.from('eosio.token'), actions, signer);
    }

    async addPerm(permission: NameType, signer: Signer) {
        const actions = [
            {
                account: 'eosio.token',
                name: 'addperm',
                authorization: [
                    {
                        actor: 'eosio.token',
                        permission: 'active',
                    },
                ],
                data: {
                    per: permission,
                },
            },
        ];

        await transact(Name.from('eosio.token'), actions, signer);
    }
}

export { EosioTokenContract };
