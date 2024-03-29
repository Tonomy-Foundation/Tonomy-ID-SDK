/* eslint-disable camelcase */
import { API, Name, NameType } from '@wharfkit/antelope';
import { Signer, transact } from '../eosio/transaction';
import { getApi } from '../eosio/eosio';

const CONTRACT_NAME = 'vesting.tmy';

interface VestingSetttings {
    sales_start_date: string;
    launch_date: string;
}

interface VestingAllocation {
    cliff_period_claimed: number;
    holder: string;
    seconds_since_sale_start: number;
    tokens_claimed: string;
    total_allocated: string;
    vesting_category_type: number;
}
export class VestingContract {
    static singletonInstance: VestingContract;
    contractName = CONTRACT_NAME;

    public static get Instance() {
        return this.singletonInstance || (this.singletonInstance = new this());
    }

    constructor(contractName = CONTRACT_NAME) {
        this.contractName = contractName;
    }

    async updatedate(
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
            name: 'updatedate',
            data: {
                sales_start_date: salesDateStr,
                launch_date: launchDateStr,
            },
        };

        return await transact(Name.from(CONTRACT_NAME), [action], signer);
    }

    async assignTokens(
        sender: string,
        holder: string,
        amount: string,
        categoryId: number,
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

    async withdraw(holder: Name, signer: Signer): Promise<API.v1.PushTransactionResponse> {
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

    async getSettings(): Promise<VestingSetttings> {
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
        });

        return res.rows;
    }
}
