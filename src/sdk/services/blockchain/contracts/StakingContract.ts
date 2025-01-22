/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';

const CONTRACT_NAME = 'staking.tmy';

export interface StakingAllocation {
    id: number;
    account_name: string;
    stake_time: { _count: number };
    unstake_time: { _count: number };
    unstake_requested: boolean;
}

export class StakingContract {
    static singletonInstance: StakingContract;
    contractName = CONTRACT_NAME;

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
}
