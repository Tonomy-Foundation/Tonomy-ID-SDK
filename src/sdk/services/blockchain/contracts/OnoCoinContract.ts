/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';

const CONTRACT_NAME = 'onocoin.tmy';

class OnoCoinContract {
    static singletonInstande: OnoCoinContract;

    public static get Instance() {
        return this.singletonInstande || (this.singletonInstande = new this());
    }

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

    async issue(quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
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
                    to: CONTRACT_NAME,
                    quantity,
                    memo: 'issued',
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async selfIssue(to: Name, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
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
                    memo: 'self issued',
                },
            },
        ];

        return await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async addPerm(permission: NameType, signer: Signer) {
        const actions = [
            {
                account: CONTRACT_NAME,
                name: 'addperm',
                authorization: [
                    {
                        actor: CONTRACT_NAME,
                        permission: 'active',
                    },
                ],
                data: {
                    per: permission,
                },
            },
        ];

        await transact(Name.from(CONTRACT_NAME), actions, signer);
    }

    async getBalance(account: NameType): Promise<number> {
        const assets = await (await getApi()).v1.chain.get_currency_balance(CONTRACT_NAME, account, 'SYS');

        if (assets.length === 0) return 0;

        return assets[0].value;
    }
}

export { OnoCoinContract };
