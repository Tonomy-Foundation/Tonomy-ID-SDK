import { NameType } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import {
    ActionData,
    assetToAmount,
    LEOS_SEED_LATE_ROUND_PRICE,
    LEOS_SEED_ROUND_PRICE,
    VestingContract,
} from '../../sdk/services/blockchain';

// @ts-expect-error args unused
export async function vestingMigrate(args: any, options: StandardProposalOptions) {
    // Testnet list
    const migrateAccounts = [
        'p42pwxofd1vy', // 36 allocations
        'pwgvt1xn4ce5', // 10 allocations
        'p2mbvozcqp2l', // 5 allocations
    ];

    const actions: ActionData[] = [];

    for (const account of migrateAccounts) {
        const accountActions = await createAccountActions(account);

        actions.push(...accountActions);
    }

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested
    );

    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

async function createAccountActions(account: NameType): Promise<ActionData[]> {
    const allocations = await VestingContract.Instance.getAllocations(account);

    const actions: ActionData[] = [];

    for (const allocation of allocations) {
        const oldCategory = allocation.vesting_category_type;

        let newCategory = 8;
        let newAmount = 0;

        if (oldCategory === 1 || oldCategory === 2) {
            if (oldCategory === 1) {
                const oldLeosPrice = 0.002;
                const newLeosPrice = LEOS_SEED_ROUND_PRICE;
                const amount = assetToAmount(allocation.tokens_allocated);

                newAmount = (amount * oldLeosPrice) / newLeosPrice;
            } else {
                const oldLeosPrice = 0.004;
                const newLeosPrice = LEOS_SEED_LATE_ROUND_PRICE;
                const amount = assetToAmount(allocation.tokens_allocated);

                newAmount = (amount * oldLeosPrice) / newLeosPrice;

                newCategory = 9;
            }

            const oldAmount = allocation.tokens_allocated;
            const newAsset = `${newAmount.toFixed(6)} LEOS`;

            console.log(
                `Migrating account ${account.toString()} allocation ${allocation.id} from ${oldAmount} to ${newAsset}`
            );
            actions.push(
                createMigrateAction(
                    'coinsale.tmy',
                    account.toString(),
                    allocation.id,
                    oldAmount,
                    newAsset,
                    oldCategory,
                    newCategory
                )
            );
        }
    }

    return actions;
}

function createMigrateAction(
    sender: string,
    holder: string,
    allocationId: number,
    oldAmount: string,
    newAmount: string,
    oldCategoryId: number,
    newCategoryId: number
) {
    return {
        account: 'vesting.tmy',
        name: 'migratealloc',
        authorization: [
            {
                actor: sender,
                permission: 'owner',
            },
            {
                actor: 'vesting.tmy',
                permission: 'active',
            },
        ],
        data: {
            sender,
            holder,
            // eslint-disable-next-line camelcase
            allocation_id: allocationId,
            // eslint-disable-next-line camelcase
            old_amount: oldAmount,
            // eslint-disable-next-line camelcase
            new_amount: newAmount,
            // eslint-disable-next-line camelcase
            old_category_id: oldCategoryId,
            // eslint-disable-next-line camelcase
            new_category_id: newCategoryId,
        },
    };
}
