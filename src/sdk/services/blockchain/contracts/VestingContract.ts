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

    async getUnlockableBalance(account: NameType): Promise<number> {
        const allocations = await this.getAllocations(account);
        const totalUnlockable = 0;

        const currentTime = Math.floor(Date.now() / 1000);

        return totalUnlockable;
    }
}
