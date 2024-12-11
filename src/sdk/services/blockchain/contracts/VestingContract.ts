/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';
import { addMicroseconds } from '../../../util';

const CONTRACT_NAME = 'vesting.tmy';

export interface VestingSettings {
    sales_start_date: string;
    launch_date: string;
}

export const LEOS_SEED_ROUND_PRICE = 0.0002;
export const LEOS_SEED_LATE_ROUND_PRICE = 0.0004;
export const LEOS_PUBLIC_SALE_PRICE = 0.0012;
export const LEOS_CURRENT_PRICE = LEOS_SEED_ROUND_PRICE;

export interface VestingAllocation {
    id: number;
    cliff_period_claimed: number;
    holder: string;
    time_since_sale_start: { _count: number };
    tokens_claimed: string;
    tokens_allocated: string;
    vesting_category_type: number;
}

const MICROSECONDS_PER_DAY = 24 * 60 * 60 * 1000000;
const MICROSECONDS_PER_SECOND = 1000000;

const vestingCategories: Map<
    number,
    { startDelay: number; cliffPeriod: number; vestingPeriod: number; tgeUnlock: number }
> = new Map([
    [
        999, // Testing Category
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.0,
        },
    ],
    [
        998, // Testing Category
        {
            startDelay: 10 * MICROSECONDS_PER_SECOND,
            cliffPeriod: 10 * MICROSECONDS_PER_SECOND,
            vestingPeriod: 20 * MICROSECONDS_PER_SECOND,
            tgeUnlock: 0.5,
        },
    ],
    [
        1, // Seed Private Sale (DEPRECIATED)
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 6 * 30 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
        },
    ],
    [
        2, // Strategic Partnerships Private Sale (DEPRECIATED)
        {
            startDelay: 6 * 30 * MICROSECONDS_PER_DAY,
            cliffPeriod: 6 * 30 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
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
        },
    ],
    [
        4, // Team and Advisors, Ecosystem
        {
            startDelay: 1 * 365 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
        },
    ],
    [
        5, // Legal and Compliance
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 1 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
        },
    ],
    [
        6, // Reserves, Partnerships, Liquidly Allocation
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
        },
    ],
    [
        7, // Community and Marketing, Platform Dev, Infra Rewards
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 5 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.0,
        },
    ],
    // New (replacing depreciated):
    [
        8, // Seed (Early Bird)
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.05,
        },
    ],
    [
        9, // Seed (Last Chance)
        {
            startDelay: 0 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 2 * 365 * MICROSECONDS_PER_DAY,
            tgeUnlock: 0.025,
        },
    ],
    [
        10, // Public (TGE)
        {
            startDelay: 14 * MICROSECONDS_PER_DAY,
            cliffPeriod: 0 * MICROSECONDS_PER_DAY,
            vestingPeriod: 0 * MICROSECONDS_PER_DAY,
            tgeUnlock: 1.0,
        },
    ],
]);

export class VestingContract {
    static singletonInstance: VestingContract;
    contractName = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    static MAX_ALLOCATIONS = 150;

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

        if (res.rows.length === 0) throw new Error('Settings have not yet been set');

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
            limit: VestingContract.MAX_ALLOCATIONS + 1,
        });

        return res.rows;
    }

    async getBalance(account: NameType): Promise<number> {
        const allocations = await this.getAllocations(account);
        let totalBalance = 0;

        for (const allocation of allocations) {
            const tokens = allocation.tokens_allocated.split(' ')[0];
            const numberTokens = parseFloat(tokens);

            totalBalance += numberTokens;
        }

        return totalBalance;
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

    getVestingPeriod(categoryId: number): string {
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

    async getVestingAllocations(account: NameType): Promise<{
        totalAllocation: number;
        unlockable: number;
        allocationsDetails: {
            totalAllocation: number;
            locked: number;
            vestingStart: Date;
            vestingPeriod: string;
            unlockAtVestingStart: number;
        }[];
    }> {
        const allocations = await this.getAllocations(account); // Fetch all allocations for the account
        let totalUnlockable = 0;
        let totalAllocation = 0;
        const currentTime = new Date();
        const allocationsDetails = [];

        for (const allocation of allocations) {
            const tokensAllocated = parseFloat(allocation.tokens_allocated.split(' ')[0]);
            const tokensClaimed = parseFloat(allocation.tokens_claimed.split(' ')[0]);

            // Fetch vesting settings
            const settings = await this.getSettings();

            const vestingPeriods = VestingContract.calculateVestingPeriod(settings, allocation);

            // Destructure calculated periods
            const { vestingStart, cliffEnd, vestingEnd } = vestingPeriods;

            // Get the vesting category for `tge_unlock` details
            const vestingCategory = this.getVestingCategory(allocation.vesting_category_type);

            let claimable = 0;

            if (currentTime >= cliffEnd) {
                if (currentTime >= vestingEnd) {
                    // Vesting period complete, all tokens are unlockable
                    claimable = tokensAllocated;
                } else {
                    // Calculate the percentage of the vesting period that has passed
                    const timeSinceVestingStart = (currentTime.getTime() - vestingStart.getTime()) / 1000;
                    const vestingDuration = (vestingEnd.getTime() - vestingStart.getTime()) / 1000;
                    const vestingProgress = Math.min(timeSinceVestingStart / vestingDuration, 1.0); // Ensure it doesn't exceed 100%

                    // Calculate unlockable amount considering TGE unlock
                    claimable =
                        tokensAllocated *
                        ((1.0 - vestingCategory.tgeUnlock) * vestingProgress + vestingCategory.tgeUnlock);
                }

                // Subtract already claimed tokens
                totalUnlockable += claimable - tokensClaimed;
            }

            const locked = tokensAllocated * (1 - vestingCategory.tgeUnlock) * 0.3; // Assuming "30% of total" locked
            const unlockAtVestingStart = tokensAllocated * vestingCategory.tgeUnlock;

            totalAllocation += tokensAllocated;

            // Add allocation details
            allocationsDetails.push({
                totalAllocation: tokensAllocated,
                locked,
                vestingStart,
                unlockAtVestingStart,
                vestingPeriod: this.getVestingPeriod(allocation.vesting_category_type),
            });
        }

        return {
            totalAllocation,
            unlockable: totalUnlockable,
            allocationsDetails,
        };
    }
}
