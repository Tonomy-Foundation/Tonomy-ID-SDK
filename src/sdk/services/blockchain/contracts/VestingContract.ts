/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { addMicroseconds, getSettings } from '../../../util';
import Decimal from 'decimal.js';
import { assetToAmount, assetToDecimal } from './EosioTokenContract';

const CONTRACT_NAME = 'vesting.tmy';

export interface VestingSettings {
    sales_start_date: string;
    launch_date: string;
}

export const TONO_SEED_ROUND_PRICE = 0.0001;
export const TONO_SEED_LATE_ROUND_PRICE = 0.0002;
export const TONO_PUBLIC_SALE_PRICE = 0.0006;
export const TONO_CURRENT_PRICE = TONO_SEED_ROUND_PRICE;

export interface VestingAllocation {
    id: number;
    cliff_period_claimed: number;
    holder: string;
    time_since_sale_start: { _count: number };
    tokens_claimed: string;
    tokens_allocated: string;
    vesting_category_type: number;
}

const MICROSECONDS_PER_SECOND = 1000000;
const SECONDS_PER_HOUR = 3600;
const MICROSECONDS_PER_DAY = 24 * SECONDS_PER_HOUR * MICROSECONDS_PER_SECOND;
const MICROSECONDS_PER_MONTH = 30 * MICROSECONDS_PER_DAY;
const MICROSECONDS_PER_YEAR = 365 * MICROSECONDS_PER_DAY;

export const vestingCategories: Map<
    number,
    { startDelay: number; cliffPeriod: number; vestingPeriod: number; tgeUnlock: number; name: string }
> = new Map([
    [
        999,
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.0,
            name: 'Testing Category (no unlock)',
        },
    ],
    [
        998,
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.5,
            name: 'Testing Category (50% unlock)',
        },
    ],
    [
        1,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 6 * 30 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Seed Private Sale (DEPRECIATED)',
        },
    ],
    [
        2,
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
        3,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 0 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Public Sale (DEPRECIATED)',
        },
    ],
    [
        4,
        {
            startDelay: 1 * 365 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Team and Advisors, Ecosystem',
        },
    ],
    [
        5,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 1 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Legal and Compliance',
        },
    ],
    [
        6,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Reserves, Partnerships, Liquidly Allocation',
        },
    ],
    [
        7,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
            name: 'Community and Marketing, Platform Dev, Infra Rewards',
        },
    ],
    // New (replacing depreciated):
    [
        8,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.1,
            name: 'Seed sale',
        },
    ],
    [
        9,
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.05,
            name: 'Pre-sale',
        },
    ],
    [
        10,
        {
            startDelay: 14 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 0 * MICROSECONDS_PER_DAY,
            tgeUnlock: 1.0,
            name: 'Public sale',
        },
    ],
]);

export class VestingContract {
    static singletonInstance: VestingContract;
    contractName = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }
    static getMaxAllocations = () =>
        getSettings().environment === 'test' || getSettings().environment === 'staging' ? 5 : 150;
    static SALE_START_DATE = '2024-04-30T12:00:00';
    static VESTING_START_DATE = '2030-01-01T00:00:00';

    static calculateVestingPeriod(settings: VestingSettings, allocation: VestingAllocation) {
        const vestingCategory = vestingCategories.get(allocation.vesting_category_type);

        if (!vestingCategory) throw new Error('Invalid vesting category');

        const launchDate = new Date(settings.launch_date + 'Z');
        const vestingStart = addMicroseconds(launchDate, vestingCategory.startDelay);
        const cliffEnd = addMicroseconds(vestingStart, vestingCategory.cliffPeriod);
        const vestingEnd = addMicroseconds(vestingStart, vestingCategory.vestingPeriod);

        return {
            launchDate,
            vestingStart,
            cliffEnd,
            vestingEnd,
        };
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    async setSettings(
        salesDateStr: string,
        launchDateStr: string,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
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
                sales_start_date: salesDateStr,
                launch_date: launchDateStr,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async assignTokens(
        sender: NameType,
        holder: NameType,
        amount: string,
        categoryId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: sender.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'assigntokens',
            data: {
                sender,
                holder,
                amount,
                category: categoryId,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async withdraw(holder: NameType, signer: Signer): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: holder.toString(),
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'withdraw',
            data: {
                holder,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async migrateAllocation(
        sender: NameType,
        holder: NameType,
        allocationId: number,
        oldAmount: string,
        newAmount: string,
        oldCategoryId: number,
        newCategoryId: number,
        signer: Signer
    ): Promise<API.v1.PushTransactionResponse> {
        const action = {
            authorization: [
                {
                    actor: sender.toString(),
                    permission: 'active',
                },
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'migratealloc',
            data: {
                sender,
                holder,
                allocation_id: allocationId,
                old_amount: oldAmount,
                new_amount: newAmount,
                old_category_id: oldCategoryId,
                new_category_id: newCategoryId,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async getSettings(): Promise<VestingSettings> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: 'vesting.tmy',
            scope: 'vesting.tmy',
            table: 'settings',
            json: true,
        });

        if (res.rows.length === 0) throw new Error('Vesting settings have not yet been set');

        return res.rows[0];
    }

    async getAllocations(account: NameType): Promise<VestingAllocation[]> {
        const res = await (
            await getApi()
        ).v1.chain.get_table_rows({
            code: 'vesting.tmy',
            scope: account.toString(),
            table: 'allocation',
            json: true,
            limit: VestingContract.getMaxAllocations() + 1,
        });

        return res.rows;
    }

    async getBalance(account: NameType): Promise<number> {
        const allocations = await this.getAllocations(account);
        let totalBalance = new Decimal(0);

        for (const allocation of allocations) {
            const tokens = assetToDecimal(allocation.tokens_allocated);

            totalBalance = totalBalance.add(tokens);
        }

        return totalBalance.toNumber();
    }

    getVestingCategory(categoryId: number): {
        startDelay: number;
        cliffPeriod: number;
        vestingPeriod: number;
        tgeUnlock: number;
    } {
        const vestingCategory = vestingCategories.get(categoryId);

        if (!vestingCategory) {
            throw new Error(`Vesting category ${categoryId} not found`);
        }

        return vestingCategory;
    }

    getVestingPeriodYears(categoryId: number): string {
        const vestingCategory = vestingCategories.get(categoryId);

        if (!vestingCategory) {
            throw new Error(`Vesting category ${categoryId} not found`);
        }

        const vestingPeriod = vestingCategory.vestingPeriod;

        // Convert to seconds for categories 999 and 998, otherwise to years
        if (categoryId === 999 || categoryId === 998) {
            return `${(vestingPeriod / MICROSECONDS_PER_SECOND).toFixed(2)}`;
        } else {
            return `${(vestingPeriod / MICROSECONDS_PER_DAY).toFixed(2)}`;
        }
    }

    getVestingPeriod(categoryId: number): string {
        const vestingCategory = vestingCategories.get(categoryId);

        if (!vestingCategory) {
            throw new Error(`Vesting category ${categoryId} not found`);
        }

        const vestingPeriod = vestingCategory.vestingPeriod;

        const vestingPeriodInDays = vestingPeriod / MICROSECONDS_PER_DAY;

        if (vestingPeriodInDays < 1) {
            // If less than a day, check if it's less than an hour (in seconds)
            const vestingPeriodInSeconds = vestingPeriod / MICROSECONDS_PER_SECOND;

            if (vestingPeriodInSeconds < 60) {
                // Return seconds if it's less than a minute
                return `${vestingPeriodInSeconds.toFixed(0)} seconds`;
            } else {
                // Return hours if it's more than a minute but less than a day
                return `${(vestingPeriodInSeconds / SECONDS_PER_HOUR).toFixed(1)} hours`;
            }
        } else if (vestingPeriodInDays < 30) {
            // Return days if it's less than 30 days
            return `${vestingPeriodInDays.toFixed(1)} days`;
        } else {
            // Calculate months or years if it's 30 days or more
            const vestingPeriodInMonths = vestingPeriod / MICROSECONDS_PER_MONTH;
            const vestingPeriodInYears = vestingPeriod / MICROSECONDS_PER_YEAR;

            if (vestingPeriodInMonths < 12) {
                return `${vestingPeriodInMonths.toFixed(1)} months`;
            } else {
                return `${vestingPeriodInYears.toFixed(1)} years`;
            }
        }
    }

    async getVestingAllocations(account: NameType): Promise<{
        totalAllocation: number;
        unlockable: number;
        unlocked: number;
        locked: number;
        allocationsDetails: {
            totalAllocation: number;
            unlockable: number;
            unlocked: number;
            locked: number;
            vestingStart: Date;
            allocationDate: Date;
            vestingPeriod: string;
            unlockAtVestingStart: number;
            categoryId: number;
        }[];
    }> {
        const allocations = await this.getAllocations(account);
        const currentTime = new Date();
        const allocationsDetails = [];

        for (const allocation of allocations) {
            const tokensAllocated = assetToAmount(allocation.tokens_allocated);
            const unlocked = assetToAmount(allocation.tokens_claimed);

            const settings = await this.getSettings();

            const vestingPeriods = VestingContract.calculateVestingPeriod(settings, allocation);

            const { vestingStart, cliffEnd, vestingEnd } = vestingPeriods;

            const vestingCategory = this.getVestingCategory(allocation.vesting_category_type);

            let claimable = 0;

            if (currentTime >= cliffEnd) {
                // Calculate the percentage of the vesting period that has passed
                const timeSinceVestingStart = (currentTime.getTime() - vestingStart.getTime()) / 1000;
                const vestingDuration = (vestingEnd.getTime() - vestingStart.getTime()) / 1000;
                const vestingProgress = Math.min(timeSinceVestingStart / vestingDuration, 1.0); // Ensure it doesn't exceed 100%

                // Calculate unlockable amount considering TGE unlock
                claimable =
                    tokensAllocated * ((1.0 - vestingCategory.tgeUnlock) * vestingProgress + vestingCategory.tgeUnlock);
            }

            const unlockable = claimable - unlocked;
            const locked = tokensAllocated - unlocked;
            const unlockAtVestingStart = vestingCategory.tgeUnlock;
            const saleStart = new Date(settings.sales_start_date);

            allocationsDetails.push({
                totalAllocation: tokensAllocated,
                unlockable,
                unlocked,
                locked,
                vestingStart,
                unlockAtVestingStart,
                allocationDate: new Date(saleStart.getTime() + allocation.time_since_sale_start._count / 1000),
                vestingPeriod: this.getVestingPeriod(allocation.vesting_category_type),
                categoryId: allocation.vesting_category_type,
            });
        }

        const totalAllocation = allocationsDetails.reduce((sum, allocation) => sum + allocation.totalAllocation, 0);
        const totalUnlockable = allocationsDetails.reduce((sum, allocation) => sum + allocation.unlockable, 0);
        const totalUnlocked = allocationsDetails.reduce((sum, allocation) => sum + allocation.unlocked, 0);
        const totalLocked = allocationsDetails.reduce((sum, allocation) => sum + allocation.locked, 0);

        return {
            totalAllocation,
            unlockable: totalUnlockable,
            unlocked: totalUnlocked,
            locked: totalLocked,
            allocationsDetails,
        };
    }
}
