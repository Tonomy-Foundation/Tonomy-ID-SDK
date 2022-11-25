/* eslint-disable camelcase */
import { API, Name } from '@greymass/eosio';
import { Signer, transact } from '../eosio/transaction';

class EosioTokenContract {
    static singletonInstande: EosioTokenContract;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

    async create(supply: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        console.log('EosioTokenContract.create()');

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
        console.log('EosioTokenContract.issue()');

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
                    memo: '',
                },
            },
        ];

        return await transact(Name.from('eosio.token'), actions, signer);
    }
}

export { EosioTokenContract };
