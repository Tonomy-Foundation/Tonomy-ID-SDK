/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getAccount, getApi } from '../eosio/eosio';
import { TonomyContract } from './TonomyContract';
import { Authority } from '../eosio/authority';
import Debug from 'debug';
import { addSeconds, getSettings, SECONDS_IN_DAY } from '../../../util';
import { amountToAsset, assetToAmount } from './EosioTokenContract';

const debug = Debug('tonomy-sdk:services:blockchain:contracts:staking');
const tonomyContract = TonomyContract.Instance;
const CONTRACT_NAME = 'staking.tmy';

export interface StakingAllocation {
    id: number;
    initial_stake: string;
    tokens_staked: string;
    stake_time: { _count: number };
    unstake_time: { _count: number };
    unstake_requested: number;
}

export interface StakingAllocationDetails {
    id: number;
    staker: string;
    initialStake: string;
    staked: string;
    yieldSoFar: string;
    stakedTime: Date;
    unstakeableTime: Date;
    unstakeTime: Date;
    releaseTime: Date;
    unstakeRequested: boolean;
    monthlyYield: string;
}

export interface StakingSettings {
    currentYieldPool: string;
    yearlyStakePool: string;
    totalStaked: string;
    totalReleasing: string;
    apy: number;
}

export interface StakingAccountRaw {
    staker: string;
    total_yield: string;
    last_payout: string;
    version: number;
}

export interface StakingAccount {
    staker: string;
    totalYield: string;
    lastPayout: Date;
    version: number;
}

export interface StakingAccountAndAllocations extends StakingAccount {
    allocations: StakingAllocationDetails[];
    totalStaked: number;
    totalUnlockable: number;
    totalUnlocking: number;
    estimatedMonthlyYield: number;
}

export class StakingContract {
    static singletonInstance: StakingContract;
    contractName = CONTRACT_NAME;

    static getLockedDays = () => (getSettings().environment !== 'test' ? 30 : 30 / SECONDS_IN_DAY);
    static getReleaseDays = () => (getSettings().environment !== 'test' ? 5 : 5 / SECONDS_IN_DAY);
    static getMinimumTransfer = () => (getSettings().environment !== 'test' ? 1000 : 1);
    static MAX_ALLOCATIONS = 100;
    static MAX_APY = 2.0;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    async stakeTokens(staker: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const account = await getAccount(staker.toString());
        const activePermission = account.getPermission('active');

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
            await tonomyContract.updateactive(staker.toString(), newPermission, signer);
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

    async requestUnstake(
        staker: NameType,
        allocationId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: staker.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'requnstake',
            data: {
                account_name: staker.toString(),
                allocation_id: allocationId,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async releaseToken(
        staker: NameType,
        allocationId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: staker.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'releasetoken',
            data: {
                account_name: staker.toString(),
                allocation_id: allocationId,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async cron(signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'cron',
            data: {},
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async addYield(sender: NameType, quantity: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: sender.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'addyield',
            data: {
                sender: sender.toString(),
                quantity,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async setSettings(yearlyStakePool: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'setsettings',
            data: {
                yearly_stake_pool: yearlyStakePool,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    private async getAllocationsData(staker: NameType): Promise<StakingAllocation[]> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: CONTRACT_NAME,
            scope: staker.toString(),
            table: 'stakingalloc',
            json: true,
            limit: StakingContract.MAX_ALLOCATIONS + 1,
        });

        return res.rows;
    }

    /**
     * Get staking allocation details with improved types and calculated monthly yield.
     * @param staker - account name.
     * @param settings - current staking settings (including APY).
     */
    async getAllocations(staker: NameType, settings: StakingSettings): Promise<StakingAllocationDetails[]> {
        const allocations = await this.getAllocationsData(staker);
        const allocationDetails: StakingAllocationDetails[] = [];

        for (const allocation of allocations) {
            const stakedTime = new Date(allocation.stake_time.toString() + 'Z');
            const unstakeTime = new Date(allocation.unstake_time.toString() + 'Z');
            const monthlyYield = amountToAsset(
                assetToAmount(allocation.tokens_staked) * (Math.pow(1 + settings.apy, 1 / 12) - 1),
                'LEOS'
            ); // Monthly yield from yearly APY.
            const yieldSoFar = amountToAsset(
                assetToAmount(allocation.tokens_staked) - assetToAmount(allocation.initial_stake),
                'LEOS'
            );

            allocationDetails.push({
                id: allocation.id,
                staker: staker.toString(),
                initialStake: allocation.initial_stake,
                staked: allocation.tokens_staked,
                yieldSoFar,
                stakedTime,
                unstakeableTime: addSeconds(stakedTime, StakingContract.getLockedDays() * SECONDS_IN_DAY),
                unstakeTime,
                releaseTime: addSeconds(unstakeTime, StakingContract.getReleaseDays() * SECONDS_IN_DAY),
                unstakeRequested: allocation.unstake_requested === 1,
                monthlyYield,
            });
        }

        return allocationDetails;
    }

    private async getSettingsData(): Promise<any> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: CONTRACT_NAME,
            scope: CONTRACT_NAME,
            table: 'settings',
            json: true,
            limit: 1,
        });

        if (res.rows.length === 0) throw new Error('Staking settings have not yet been set');

        return res.rows[0];
    }

    /**
     * Get staking settings with improved types and calculated APY.
     *
     * Calculated APY = min(yearlyStakePool / totalStaked, 2.0).
     * (If totalStaked is zero, APY is zero.)
     */
    async getSettings(): Promise<StakingSettings> {
        const settings = await this.getSettingsData();
        const yearlyStakePoolAmount = assetToAmount(settings.yearly_stake_pool);
        const totalStakedAmount = assetToAmount(settings.total_staked);
        const calculatedApy =
            totalStakedAmount > 0
                ? Math.min(yearlyStakePoolAmount / totalStakedAmount, StakingContract.MAX_APY)
                : StakingContract.MAX_APY;

        return {
            currentYieldPool: settings.current_yield_pool,
            yearlyStakePool: settings.yearly_stake_pool,
            totalStaked: settings.total_staked,
            totalReleasing: settings.total_releasing,
            apy: calculatedApy,
        };
    }

    private async getAccountData(account: NameType): Promise<StakingAccountRaw> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: CONTRACT_NAME,
            scope: CONTRACT_NAME,
            table: 'stakingaccou',
            json: true,
            lower_bound: Name.from(account),
            limit: 1,
        });

        if (res.rows.length === 0 || res.rows[0].staker !== account.toString())
            throw new Error('Account not found in staking contract');

        return res.rows[0];
    }

    async getAccount(account: NameType): Promise<StakingAccount> {
        const raw = await this.getAccountData(account);

        return {
            staker: raw.staker,
            totalYield: raw.total_yield,
            lastPayout: new Date(raw.last_payout + 'Z'),
            version: raw.version,
        };
    }

    /**
     * Returns full staking data for an account including:
     * - Typed staking account info.
     * - An array of typed allocations.
     * - Aggregated metrics:
     *    • estimatedMonthlyYield: Sum of monthly yields from active allocations.
     *    • lastPayout: Last time the account received a payout.
     *    • version: Account version.
     *    • totalYield: Total yield from all allocations.
     *    • totalStaked: Sum of active (non-unstaking) allocation amounts.
     *    • totalMonthlyYield: Sum of monthly yields from active allocations.
     *    • totalUnlockable: Sum of allocations that have completed the release period.
     *    • totalUnlocking: Sum of allocations still within the release period.
     */
    async getAccountAndAllocations(account: NameType): Promise<StakingAccountAndAllocations> {
        const settings = await this.getSettings();
        const allocations = await this.getAllocations(account, settings);
        const stakingAccount = await this.getAccount(account);

        let totalStaked = 0;
        let estimatedMonthlyYield = 0;
        let totalUnlockable = 0;
        let totalUnlocking = 0;
        const now = new Date();

        for (const alloc of allocations) {
            const stakedAmount = assetToAmount(alloc.staked);

            if (!alloc.unstakeRequested) {
                totalStaked += stakedAmount;
                estimatedMonthlyYield += assetToAmount(alloc.monthlyYield);
            } else {
                // If unstake has been requested, check if release time has passed.
                if (alloc.releaseTime <= now) {
                    totalUnlockable += stakedAmount;
                } else {
                    totalUnlocking += stakedAmount;
                }
            }
        }

        return {
            ...stakingAccount,
            allocations,
            totalStaked,
            totalUnlockable,
            totalUnlocking,
            estimatedMonthlyYield,
        };
    }
}
