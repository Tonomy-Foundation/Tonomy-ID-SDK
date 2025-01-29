/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getAccount, getApi } from '../eosio/eosio';
import { TonomyEosioProxyContract } from './TonomyEosioProxyContract';
import { Authority } from '../eosio/authority';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:services:blockchain:contracts:staking');

const tonomyProxyContract = TonomyEosioProxyContract.Instance;
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

    async stakeTokens(staker: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const account = await getAccount(staker.toString());
        const activePermission = account.getPermission('active');

        // first we need to add the { actor: "staking.tmy", permission: "eosio.code" } to the staker account's active permission
        // if it is not already there, to be able to execute/authorize the token transfer inline action
        if (
            !activePermission.required_auth.accounts.some(
                (acc) =>
                    acc.permission.actor.toString() === CONTRACT_NAME &&
                    acc.permission.permission.toString() === 'eosio.code'
            )
        ) {
            const newPermission = Authority.fromAccountPermission(activePermission);

            newPermission.addCodePermission(CONTRACT_NAME);
            debug('Adding staking.tmy@eosio.code to active permission', JSON.stringify(newPermission, null, 2));
            await tonomyProxyContract.updateauth(staker.toString(), 'active', 'owner', newPermission, signer);
        }

        const action = {
            authorization: [
                {
                    actor: staker.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'staketokens',
            data: {
                account_name: staker.toString(),
                quantity,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async getAllocations(staker: NameType): Promise<StakingAllocation[]> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: 'staking.tmy',
            scope: staker.toString(),
            table: 'stakingalloc',
            json: true,
            limit: StakingContract.MAX_ALLOCATIONS + 1,
        });

        return res.rows;
    }
}
