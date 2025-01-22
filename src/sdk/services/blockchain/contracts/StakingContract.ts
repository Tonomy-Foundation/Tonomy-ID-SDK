/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';

const CONTRACT_NAME = 'staking.tmy';

export interface StakingAllocation {
    id: number;
    account_name: string;
    tokens_staked: string;
    stake_time: { _count: number };
    unstake_time: { _count: number };
    unstake_requested: boolean;
}

export class StakingContract {
    static singletonInstance: StakingContract;
    contractName = CONTRACT_NAME;

    static MAX_ALLOCATIONS = 150;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    async stakeTokens(
        accountName: NameType,
        quantity: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: accountName.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'staketokens',
            data: {
                account_name: accountName.toString(),
                quantity,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async getAllocations(account: NameType): Promise<StakingAllocation[]> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: 'staking.tmy',
            scope: account.toString(),
            table: 'allocation',
            json: true,
            limit: StakingContract.MAX_ALLOCATIONS + 1,
        });

        return res.rows;
    }
}
