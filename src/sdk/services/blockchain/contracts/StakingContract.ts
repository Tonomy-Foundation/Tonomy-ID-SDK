/* eslint-disable camelcase */
import { API, Name, NameType, AssetType, Action, Asset, TimePoint, UInt32, Int32, UInt64 } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getAccount, getApi } from '../eosio/eosio';
import { Contract, loadContract } from './Contract';
import { Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { getTonomyContract } from './TonomyContract';
import { Authority, activeAuthority } from '../eosio/authority';
import Debug from 'debug';
import { getSettings, isProduction } from '../../../util/settings';
import { SdkErrors, throwError } from '../../../util/errors';
import { addSeconds, SECONDS_IN_DAY } from '../../../util/time';
import abi from './abi/staking.tmy.abi.json';
import { amountToAsset, assetToAmount, EosioTokenContract } from './EosioTokenContract';

const debug = Debug('tonomy-sdk:services:blockchain:contracts:staking');
const CONTRACT_NAME: NameType = 'staking.tmy';

// TODO: update assets to use Asset class instead

export interface StakingAllocationRaw {
    id: UInt64;
    initial_stake: Asset;
    tokens_staked: Asset;
    stake_time: TimePoint;
    unstake_time: TimePoint;
    unstake_requested: boolean;
}

export interface StakingAllocation {
    id: number;
    staker: Name;
    initialStake: string; // Asset
    staked: string; // Asset
    yieldSoFar: string; // Asset
    stakedTime: Date;
    unstakeableTime: Date;
    unstakeTime: Date;
    releaseTime: Date;
    unstakeRequested: boolean;
    monthlyYield: string; // Asset
}

export interface StakingSettingsRaw {
    current_yield_pool: Asset;
    yearly_stake_pool: Asset;
    total_staked: Asset;
    total_releasing: Asset;
}

export interface StakingSettings {
    currentYieldPool: string; // Asset
    yearlyStakePool: string; // Asset
    totalStaked: string; // Asset
    totalReleasing: string; // Asset
    apy: number;
}

export interface StakingAccountRaw {
    staker: Name;
    total_yield: Asset;
    last_payout: TimePoint;
    payments: UInt32;
    version: Int32;
}

export interface StakingAccount {
    staker: Name;
    totalYield: string; // Asset
    lastPayout: Date;
    payments: number;
    version: number;
}

export interface StakingAccountState extends StakingAccount {
    allocations: StakingAllocation[];
    totalStaked: number;
    totalUnlockable: number;
    totalUnlocking: number;
    estimatedMonthlyYield: number;
    settings: StakingSettings;
}

export class StakingContract extends Contract {
    static isTestEnv = () => ['test', 'staging'].includes(getSettings().environment);

    static getLockedDays: () => number = () => (this.isTestEnv() ? 10 / SECONDS_IN_DAY : 14); // 14 days or 10 seconds
    static getReleaseDays: () => number = () => (this.isTestEnv() ? 5 / SECONDS_IN_DAY : 5); // 5 days or 5 seconds
    static getMinimumTransfer: () => number = () => (this.isTestEnv() ? 1 : 1000); // 1000 TONO or 1 TONO
    static getMaxAllocations: () => number = () => (this.isTestEnv() ? 5 : 20); // 100 allocations or 5 allocations
    static getStakingCycleHours: () => number = () => (this.isTestEnv() ? 1 / 60 : 24); // 24 hours or 1 minute
    static MAX_APY = 1.0;
    static STAKING_APY_TARGET = 0.5; // 50% annual yield target
    // Use the TGE unlock: https://docs.google.com/spreadsheets/d/1uyvpgXC0th3Z1_bz4m18dJKy2yyVfYFmcaEyS9fveeA/edit?gid=1074294213#gid=1074294213&range=Q34
    static STAKING_ESTIMATED_STAKED_PERCENT = 0.151; // 15.1% of total supply staked
    static yearlyStakePool =
        StakingContract.STAKING_APY_TARGET *
        StakingContract.STAKING_ESTIMATED_STAKED_PERCENT *
        EosioTokenContract.TOTAL_SUPPLY;

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): StakingContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, isProduction());
    }

    static async atAccount(account: NameType = CONTRACT_NAME): Promise<StakingContract> {
        return new this(await loadContract(account));
    }

    actions = {
        stakeTokens: (
            data: { accountName: NameType; quantity: AssetType },
            authorization: ActionOptions = activeAuthority(data.accountName)
        ): Action =>
            this.action('staketokens', { account_name: data.accountName, quantity: data.quantity }, authorization),
        requestUnstake: (
            data: { accountName: NameType; allocationId: number },
            authorization: ActionOptions = activeAuthority(data.accountName)
        ): Action =>
            this.action(
                'requnstake',
                { account_name: data.accountName, allocation_id: data.allocationId },
                authorization
            ),
        releaseToken: (
            data: { accountName: NameType; allocationId: number },
            authorization: ActionOptions = activeAuthority(data.accountName)
        ): Action =>
            this.action(
                'releasetoken',
                { account_name: data.accountName, allocation_id: data.allocationId },
                authorization
            ),
        cron: (authorization?: ActionOptions): Action => this.action('cron', {}, authorization),
        resetAll: (authorization?: ActionOptions): Action => this.action('resetall', {}, authorization),
        addYield: (
            data: { sender: NameType; quantity: AssetType },
            authorization: ActionOptions = activeAuthority(data.sender)
        ): Action => this.action('addyield', data, authorization),
        setSettings: (data: { yearlyStakePool: string }, authorization?: ActionOptions): Action =>
            this.action('setsettings', { yearly_stake_pool: data.yearlyStakePool }, authorization),
    };

    async stakeTokens(staker: NameType, quantity: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const acct = await getAccount(staker);
        const activePerm = acct.getPermission('active');

        // Ensure the staker has the eosio.code permission for the staking contract
        if (
            !activePerm.required_auth.accounts.some(
                (acc) =>
                    acc.permission.actor.toString() === CONTRACT_NAME &&
                    acc.permission.permission.toString() === 'eosio.code'
            )
        ) {
            const newPerm = Authority.fromAccountPermission(activePerm);

            newPerm.addCodePermission(CONTRACT_NAME.toString());
            debug('Adding staking.tmy@eosio.code to active permission', JSON.stringify(newPerm, null, 2));
            await getTonomyContract().updateActive(staker, newPerm, signer);
        }

        const action = this.actions.stakeTokens({ accountName: staker, quantity });

        return await transact(action, signer);
    }

    async requestUnstake(
        staker: NameType,
        allocationId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.requestUnstake({ accountName: staker, allocationId });

        return await transact(action, signer);
    }

    async releaseToken(
        staker: NameType,
        allocationId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.releaseToken({ accountName: staker, allocationId });

        return await transact(action, signer);
    }

    async cron(signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.cron();

        return await transact(action, signer);
    }

    async resetAll(signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.resetAll();

        return await transact(action, signer);
    }

    async addYield(sender: NameType, quantity: AssetType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.addYield({ sender, quantity });

        return await transact(action, signer);
    }

    async setSettings(yearlyStakePool: string, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setSettings({ yearlyStakePool });

        return await transact(action, signer);
    }

    private async getAllocationsData(staker: NameType): Promise<StakingAllocationRaw[]> {
        const stakingAllocationsTable = this.contract.table<StakingAllocationRaw>('stakingalloc', staker);

        return await stakingAllocationsTable.all();
    }

    /**
     * Get staking allocation details with improved types and calculated monthly yield.
     * @param staker - account name.
     * @param settings - current staking settings (including APY).
     */
    async getAllocations(staker: NameType, settings: StakingSettings): Promise<StakingAllocation[]> {
        const allocations = await this.getAllocationsData(staker);

        const allocationDetails: StakingAllocation[] = [];

        for (const allocation of allocations) {
            const stakedTime = new Date(allocation.stake_time.toString() + 'Z');
            const unstakeTime = new Date(allocation.unstake_time.toString() + 'Z');
            const monthlyYield = amountToAsset(
                allocation.unstake_requested
                    ? 0
                    : await this.calculateMonthlyYield(assetToAmount(allocation.tokens_staked.toString()), settings),
                'TONO'
            ); // Monthly yield from yearly APY.
            const yieldSoFar = amountToAsset(
                assetToAmount(allocation.tokens_staked.toString()) - assetToAmount(allocation.initial_stake.toString()),
                'TONO'
            );

            allocationDetails.push({
                id: allocation.id.toNumber(),
                staker: Name.from(staker),
                initialStake: allocation.initial_stake.toString(),
                staked: allocation.tokens_staked.toString(),
                yieldSoFar,
                stakedTime,
                unstakeableTime: addSeconds(stakedTime, StakingContract.getLockedDays() * SECONDS_IN_DAY),
                unstakeTime,
                releaseTime: addSeconds(unstakeTime, StakingContract.getReleaseDays() * SECONDS_IN_DAY),
                unstakeRequested: allocation.unstake_requested,
                monthlyYield,
            });
        }

        return allocationDetails;
    }

    private async getSettingsData(): Promise<StakingSettingsRaw> {
        const settings = await this.contract.table<StakingSettingsRaw>('settings', this.contractName).get();

        if (!settings) throw new Error('Staking settings have not yet been set');
        return settings;
    }

    /**
     * Get staking settings with improved types and calculated APY.
     *
     * Calculated APY = min(yearlyStakePool / totalStaked, 2.0).
     * (If totalStaked is zero, APY is zero.)
     */
    async getSettings(): Promise<StakingSettings> {
        const settings = await this.getSettingsData();
        const yearly = assetToAmount(settings.yearly_stake_pool.toString());
        const total = assetToAmount(settings.total_staked.toString());
        const apy = total > 0 ? Math.min(yearly / total, StakingContract.MAX_APY) : StakingContract.MAX_APY;

        return {
            currentYieldPool: settings.current_yield_pool.toString(),
            yearlyStakePool: settings.yearly_stake_pool.toString(),
            totalStaked: settings.total_staked.toString(),
            totalReleasing: settings.total_releasing.toString(),
            apy,
        };
    }

    private async getAccountData(account: NameType): Promise<StakingAccountRaw> {
        const accountTable = this.contract.table<StakingAccountRaw>('stakingaccou', this.contractName);
        const res = await accountTable.get(account);

        if (!res) throwError('Account not found in staking contract', SdkErrors.AccountNotFound);
        return res;
    }

    async getAccount(account: NameType): Promise<StakingAccount> {
        const raw = await this.getAccountData(account);

        return {
            staker: raw.staker,
            totalYield: raw.total_yield.toString(),
            lastPayout: new Date(raw.last_payout + 'Z'),
            payments: raw.payments.toNumber(),
            version: raw.version.toNumber(),
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
    async getAccountState(account: NameType): Promise<StakingAccountState> {
        const settings = await this.getSettings();
        const allocations = await this.getAllocations(account, settings);
        const stakingAccount = await this.getAccount(account);

        let totalStaked = 0;
        let estimatedMonthlyYield = 0;
        let totalUnlocking = 0;

        for (const alloc of allocations) {
            const stakedAmount = assetToAmount(alloc.staked);

            if (!alloc.unstakeRequested) {
                totalStaked += stakedAmount;
                estimatedMonthlyYield += assetToAmount(alloc.monthlyYield);
            } else {
                // If unstake has been requested, check if release time has passed.
                totalUnlocking += stakedAmount;
            }
        }

        return {
            ...stakingAccount,
            allocations,
            totalStaked,
            totalUnlockable: 0,
            totalUnlocking,
            estimatedMonthlyYield,
            settings,
        };
    }

    async calculateMonthlyYield(amount: number, settings: StakingSettings): Promise<number> {
        return amount * (Math.pow(1 + settings.apy, 1 / 12) - 1);
    }
}

let stakingContract: StakingContract | undefined;

export const getStakingContract = () => {
    if (!stakingContract) {
        stakingContract = StakingContract.fromAbi(abi);
    }

    return stakingContract;
};

export async function loadStakingContract(account: NameType = CONTRACT_NAME): Promise<StakingContract> {
    return await StakingContract.atAccount(account);
}
