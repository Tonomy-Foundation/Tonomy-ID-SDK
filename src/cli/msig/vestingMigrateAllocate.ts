import { NameType } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { ActionData, assetToAmount, VestingContract } from '../../sdk/services/blockchain';

// @ts-expect-error args unused
export async function vestingMigrate(args: {}, options: StandardProposalOptions) {
    const migrateAccounts = [''];

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

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
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
                const newLeosPrice = 0.0005;
                const amount = assetToAmount(allocation.tokens_allocated);

                newAmount = (amount * oldLeosPrice) / newLeosPrice;
            } else {
                const oldLeosPrice = 0.004;
                const newLeosPrice = 0.001;
                const amount = assetToAmount(allocation.tokens_allocated);

                newAmount = (amount * oldLeosPrice) / newLeosPrice;

                newCategory = 9;
            }

            const oldAmount = allocation.tokens_allocated;
            const newAsset = `${newAmount.toFixed(6)} LEOS`;

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
            allocation_id: allocationId,
            old_amount: oldAmount,
            new_amount: newAmount,
            old_category_id: oldCategoryId,
            new_category_id: newCategoryId,
        },
    };
}
