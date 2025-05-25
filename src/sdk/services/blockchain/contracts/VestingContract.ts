/* eslint-disable camelcase */
import { API, NameType, Action, AssetType } from '@wharfkit/antelope';
import { Contract, loadContract } from './Contract';
import { Contract as AntelopeContract, ActionOptions } from '@wharfkit/contract';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { addMicroseconds, getSettings } from '../../../util';
import Decimal from 'decimal.js';
import { assetToAmount, assetToDecimal } from './EosioTokenContract';
import abi from '../../../../../Tonomy-Contracts/contracts/vesting.tmy/vesting.tmy.abi.json';
import { activeAuthority } from '../eosio/authority';

const CONTRACT_NAME: NameType = 'vesting.tmy';

export const TONO_SEED_ROUND_PRICE = 0.0001;
export const TONO_SEED_LATE_ROUND_PRICE = 0.0002;
export const TONO_PUBLIC_SALE_PRICE = 0.0006;
export const TONO_CURRENT_PRICE = TONO_SEED_ROUND_PRICE;

const MICROSECONDS_PER_SECOND = 1_000_000;
const SECONDS_PER_HOUR = 3_600;
const MICROSECONDS_PER_DAY = 24 * SECONDS_PER_HOUR * MICROSECONDS_PER_SECOND;
const MICROSECONDS_PER_MONTH = 30 * MICROSECONDS_PER_DAY;
const MICROSECONDS_PER_YEAR = 365 * MICROSECONDS_PER_DAY;

// TODO: update assets to use Asset class instead

export interface VestingAllocationRaw {
    id: number;
    holder: NameType;
    time_since_sale_start: { _count: number };
    tokens_claimed: string; // Asset
    tokens_allocated: string; // Asset
    vesting_category_type: number;
}

export interface VestingAllocation {
    id: number;
    holder: NameType;
    timeSinceSaleStart: number; // microseconds
    tokensClaimed: string; // Asset
    tokensAllocated: string; // Asset
    vestingCategoryType: number;
}

export interface VestingAllocationDetails {
    totalAllocation: string; // Asset
    unlockable: string; // Asset
    unlocked: string; // Asset
    locked: string; // Asset
    vestingStart: Date;
    allocationDate: Date;
    vestingPeriod: number; // in microseconds
    unlockAtVestingStart: number; // percentage (0.0 to 1.0)
    categoryId: number;
}

interface VestingAllocationsParsed {
    totalAllocation: number;
    unlockable: number;
    unlocked: number;
    locked: number;
    vestingStart: Date;
    allocationDate: Date;
    vestingPeriod: string;
    unlockAtVestingStart: number;
    categoryId: number;
}
export interface VestingSettingsRaw {
    sales_start_date: string;
    launch_date: string;
}
export interface VestingSettings {
    salesStartDate: Date;
    launchDate: Date;
}

export const vestingCategories: Map<
    number,
    { startDelay: number; cliffPeriod: number; vestingPeriod: number; tgeUnlock: number; name: string }
> = new Map([
    [
        999, // Testing Category
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.0,
            name: 'Testing Category (no unlock)',
        },
    ],
    [
        998, // Testing Category
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.5,
            name: 'Testing Category (50% unlock)',
        },
    ],
    [
        1, // Seed Private Sale (DEPRECIATED)
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 6 * 30 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Seed Private Sale (DEPRECIATED)',
        },
    ],
    [
        2, // Strategic Partnerships Private Sale (DEPRECIATED)
        {
            startDelay: 6 * 30 * MICROSECONDS_PER_DAY,
            cliffPeriod: 6 * 30 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Strategic Partnerships Private Sale (DEPRECIATED)',
        },
    ],
    // Unchanged:
    [
        3, // Public Sale (DO NOT USED YET)
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 0 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Public Sale (DEPRECIATED)',
        },
    ],
    [
        4, // Team
        {
            startDelay: 1 * 365 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Team',
        },
    ],
    [
        5, // Legal and Compliance
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 1 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Legal and Compliance',
        },
    ],
    [
        6, // Reserves, Partnerships
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Reserves, Partnerships',
        },
    ],
    [
        7, // Community and Marketing, Platform Dev, Infra Rewards, Ecosystem
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Community and Marketing, Platform Dev, Infra Rewards, Ecosystem',
        },
    ],
    // New (replacing depreciated):
    [
        8, // Seed
        {
            startDelay: 6 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 12 * MICROSECONDS_PER_MONTH,
            tgeUnlock: 0.05,
            name: 'Seed',
        },
    ],
    [
        9, // Pre-Sale
        {
            startDelay: 4 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 12 * MICROSECONDS_PER_MONTH,
            tgeUnlock: 0.075,
            name: 'Pre-Sale',
        },
    ],
    [
        10, // Public (TGE)
        {
            startDelay: 1 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 3 * MICROSECONDS_PER_MONTH,
            tgeUnlock: 0.25,
            name: 'Public (TGE)',
        },
    ],
    [
        11, // Private
        {
            startDelay: 3 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 9 * MICROSECONDS_PER_MONTH,
            tgeUnlock: 0.125,
            name: 'Private',
        },
    ],
    [
        12, // KOL
        {
            startDelay: 1 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 3 * MICROSECONDS_PER_MONTH,
            tgeUnlock: 0.25,
            name: 'KOL',
        },
    ],
    [
        13, // Incubator
        {
            startDelay: 0 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 6 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.7,
            name: 'Incubator',
        },
    ],
    [
        14, // Liquidity
        {
            startDelay: 0 * MICROSECONDS_PER_MONTH,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 6 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.25,
            name: 'Liquidity',
        },
    ],
]);

export class VestingContract extends Contract {
    static isTestEnv = () => ['test', 'staging'].includes(getSettings().environment);

    static async atAccount(account: NameType = CONTRACT_NAME): Promise<VestingContract> {
        return new this(await loadContract(account));
    }

    static fromAbi(abi: any, account: NameType = CONTRACT_NAME): VestingContract {
        const contract = new AntelopeContract({ abi, client: getApi(), account });

        return new this(contract, false);
    }

    static getMaxAllocations(): number {
        return this.isTestEnv() ? 5 : 150;
    }
    static SALE_START_DATE = '2024-04-30T12:00:00';
    static VESTING_START_DATE = '2030-01-01T00:00:00';

    static calculateVestingPeriod(settings: VestingSettings, allocation: VestingAllocation) {
        const category = vestingCategories.get(allocation.vestingCategoryType);

        if (!category) throw new Error('Invalid vesting category');
        const launchDate = settings.launchDate;
        const vestingStart = addMicroseconds(launchDate, category.startDelay);
        const cliffEnd = addMicroseconds(vestingStart, category.cliffPeriod);
        const vestingEnd = addMicroseconds(vestingStart, category.vestingPeriod);

        return { launchDate, vestingStart, cliffEnd, vestingEnd };
    }

    actions = {
        setsettings: (data: { salesStartDate: string; launchDate: string }, auth?: ActionOptions): Action =>
            this.action(
                'setsettings',
                {
                    sales_start_date: data.salesStartDate,
                    launch_date: data.launchDate,
                },
                auth
            ),

        assigntokens: (
            data: {
                sender: NameType;
                holder: NameType;
                amount: string;
                category: number;
            },
            auth: ActionOptions = activeAuthority(data.sender)
        ): Action => this.action('assigntokens', data, auth),
        withdraw: (data: { holder: NameType }, auth: ActionOptions = activeAuthority(data.holder)): Action =>
            this.action('withdraw', { holder: data.holder }, auth),
        migratealloc: (
            data: {
                sender: NameType;
                holder: NameType;
                allocationId: number;
                oldAmount: AssetType;
                newAmount: AssetType;
                oldCategoryId: number;
                newCategoryId: number;
            },
            auth?: ActionOptions
        ): Action =>
            this.action(
                'migratealloc',
                {
                    sender: data.sender,
                    holder: data.holder,
                    allocation_id: data.allocationId,
                    old_amount: data.oldAmount,
                    new_amount: data.newAmount,
                    old_category_id: data.oldCategoryId,
                    new_category_id: data.newCategoryId,
                },
                auth
            ),
    };

    async setSettings(
        salesStartDate: string,
        launchDate: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.setsettings({ salesStartDate, launchDate });

        return transact([action], signer);
    }

    async assignTokens(
        sender: NameType,
        holder: NameType,
        amount: string,
        category: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.assigntokens({ sender, holder, amount, category });

        return transact([action], signer);
    }

    async withdraw(holder: NameType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.withdraw({ holder });

        return transact([action], signer);
    }

    async migrateAllocation(
        sender: NameType,
        holder: NameType,
        allocationId: number,
        oldAmount: AssetType,
        newAmount: AssetType,
        oldCategoryId: number,
        newCategoryId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = this.actions.migratealloc({
            sender,
            holder,
            allocationId,
            oldAmount,
            newAmount,
            oldCategoryId,
            newCategoryId,
        });

        return transact([action], signer);
    }

    private async getSettingsData(): Promise<VestingSettingsRaw> {
        const table = this.contract.table<VestingSettingsRaw>('settings', this.contractName);
        const res = await table.get();

        if (!res) throw new Error('Vesting settings have not yet been set');
        return res;
    }

    async getSettings(): Promise<VestingSettings> {
        const settings = await this.getSettingsData();

        return {
            salesStartDate: new Date(settings.sales_start_date + 'Z'),
            launchDate: new Date(settings.launch_date + 'Z'),
        };
    }

    private async getAllocationsData(account: NameType): Promise<VestingAllocationRaw[]> {
        const res = this.contract.table<VestingAllocationRaw>('allocation', account).all();

        if (!res) throw new Error(`No allocations found for account ${account}`);
        return res;
    }

    async getAllocations(account: NameType): Promise<VestingAllocation[]> {
        const res = await this.getAllocationsData(account);

        return res.map((a) => ({
            id: a.id,
            holder: a.holder,
            timeSinceSaleStart: a.time_since_sale_start._count,
            tokensClaimed: a.tokens_claimed,
            tokensAllocated: a.tokens_allocated,
            vestingCategoryType: a.vesting_category_type,
        }));
    }

    async getBalance(account: NameType): Promise<number> {
        const allocs = await this.getAllocations(account);
        let total = new Decimal(0);

        for (const a of allocs) {
            total = total.add(assetToDecimal(a.tokensAllocated.toString()));
        }

        return total.toNumber();
    }

    getVestingCategory(categoryId: number) {
        const cat = vestingCategories.get(categoryId);

        if (!cat) throw new Error(`Vesting category ${categoryId} not found`);
        return cat;
    }

    getVestingPeriodYears(categoryId: number): string {
        const cat = this.getVestingCategory(categoryId);
        const period = cat.vestingPeriod;

        // Convert to seconds for categories 999 and 998, otherwise to years
        if (categoryId === 999 || categoryId === 998) {
            return `${(period / MICROSECONDS_PER_SECOND).toFixed(2)}`;
        } else {
            return `${(period / MICROSECONDS_PER_DAY).toFixed(2)}`;
        }
    }

    getVestingPeriod(categoryId: number): string {
        const cat = this.getVestingCategory(categoryId);
        const period = cat.vestingPeriod;
        const days = period / MICROSECONDS_PER_DAY;

        if (days < 1) {
            const secs = period / MICROSECONDS_PER_SECOND;

            if (secs < 60) return `${secs.toFixed(0)} seconds`;
            return `${(secs / SECONDS_PER_HOUR).toFixed(1)} hours`;
        } else if (days < 30) {
            return `${days.toFixed(1)} days`;
        } else {
            const months = period / MICROSECONDS_PER_MONTH;
            const years = period / MICROSECONDS_PER_YEAR;

            if (months < 12) return `${months.toFixed(1)} months`;
            return `${years.toFixed(1)} years`;
        }
    }

    async getVestingAllocations(account: NameType): Promise<{
        totalAllocation: number;
        unlockable: number;
        unlocked: number;
        locked: number;
        allocationsDetails: VestingAllocationsParsed[];
    }> {
        const allocations = await this.getAllocations(account);
        const now = new Date();
        const details: VestingAllocationsParsed[] = [];

        const settings = await this.getSettings();

        for (const allocation of allocations) {
            const allocated = assetToAmount(allocation.tokensAllocated);
            const claimed = assetToAmount(allocation.tokensClaimed);
            const { vestingStart, cliffEnd, vestingEnd } = VestingContract.calculateVestingPeriod(settings, allocation);
            const cat = this.getVestingCategory(allocation.vestingCategoryType);

            let claimable = 0;

            if (now >= cliffEnd) {
                const elapsed = (now.getTime() - vestingStart.getTime()) / 1000;
                const duration = (vestingEnd.getTime() - vestingStart.getTime()) / 1000;
                const progress = Math.min(elapsed / duration, 1.0);

                claimable = allocated * ((1.0 - cat.tgeUnlock) * progress + cat.tgeUnlock);
            }

            const unlockable = claimable - claimed;
            const locked = allocated - claimed;
            const saleStart = settings.salesStartDate;

            details.push({
                totalAllocation: allocated,
                unlockable,
                unlocked: claimed,
                locked,
                vestingStart,
                unlockAtVestingStart: cat.tgeUnlock,
                allocationDate: new Date(saleStart.getTime() + allocation.timeSinceSaleStart / 1000),
                vestingPeriod: this.getVestingPeriod(allocation.vestingCategoryType),
                categoryId: allocation.vestingCategoryType,
            });
        }

        const totalAllocation = details.reduce((sum, d) => sum + d.totalAllocation, 0);
        const unlockable = details.reduce((sum, d) => sum + d.unlockable, 0);
        const unlocked = details.reduce((sum, d) => sum + d.unlocked, 0);
        const locked = details.reduce((sum, d) => sum + d.locked, 0);

        return { totalAllocation, unlockable, unlocked, locked, allocationsDetails: details };
    }
}

export const vestingContract = VestingContract.fromAbi(abi);

export async function loadVestingContract(account: NameType = CONTRACT_NAME): Promise<VestingContract> {
    return VestingContract.atAccount(account);
}
