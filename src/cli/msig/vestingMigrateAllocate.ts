import { Name, NameType } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import {
    ActionData,
    assetToAmount,
    assetToDecimal,
    LEOS_SEED_LATE_ROUND_PRICE,
    LEOS_SEED_ROUND_PRICE,
    VestingContract,
} from '../../sdk/services/blockchain';
import { getAllAllocations, getAllUniqueHolders } from '../vesting';
import { getAllPeople } from '../token';

export async function vestingMigrate(options: StandardProposalOptions) {
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
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

function toBase6Plus1(num: number): string {
    const base6 = num.toString(6);

    return base6
        .split('')
        .map((digit) => (parseInt(digit, 6) + 1).toString())
        .join('');
}

export async function vestingMigrate2(options: StandardProposalOptions) {
    let count = 0;
    let proposals = 0;
    const priceMultiplier = 2.0;
    const uniqueHolders = await getAllUniqueHolders();
    const allAllocations = await getAllAllocations(uniqueHolders);

    const batchSize = 100;

    for (let i = 0; i < allAllocations.length; i += batchSize) {
        const batch = allAllocations.slice(i, i + batchSize);

        const actions: ActionData[] = batch.map((allocation) => {
            const newAmount = assetToDecimal(allocation.tokens_allocated).mul(priceMultiplier);
            const newAsset = `${newAmount.toFixed(6)} LEOS`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} in category ${allocation.vesting_category_type} from ${allocation.tokens_allocated} to ${newAsset}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokens_allocated,
                newAsset,
                allocation.vesting_category_type,
                allocation.vesting_category_type
            );
        });

        const proposalName = Name.from(`${options.proposalName}${toBase6Plus1(Math.floor(i / batchSize))}`);

        console.log(
            `Creating proposal ${proposalName.toString()} with ${actions.length} actions: ${i} - ${i + batchSize}`
        );
        console.log('----------------------------------------');
        proposals++;
        const proposalHash = await createProposal(
            options.proposer,
            proposalName,
            actions,
            options.privateKey,
            options.requested,
            options.dryRun
        );

        if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);

        console.log('----------------------------------------');
    }

    console.log(`Batch size: ${batchSize}`);
    console.log(`Proposals created: ${proposals}`);
    console.log(`Processed ${count} / ${allAllocations.length} allocations`);
}

export async function vestingMigrate3(options: StandardProposalOptions) {
    let count = 0;
    let proposals = 0;
    const priceMultiplier = 2.0;
    const people = await getAllPeople();
    const vestingHolders = await getAllUniqueHolders();

    const peopleNotInVestingHolders: Set<string> = new Set();

    for (const person of people) {
        if (!vestingHolders.has(person.account_name.toString())) {
            peopleNotInVestingHolders.add(person.account_name.toString());
        }
    }

    const missedAllocations = await getAllAllocations(peopleNotInVestingHolders);

    const batchSize = 100;

    for (let i = 0; i < missedAllocations.length; i += batchSize) {
        const batch = missedAllocations.slice(i, i + batchSize);

        const actions: ActionData[] = batch.map((allocation) => {
            const newAmount = assetToDecimal(allocation.tokens_allocated).mul(priceMultiplier);
            const newAsset = `${newAmount.toFixed(6)} LEOS`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} in category ${allocation.vesting_category_type} from ${allocation.tokens_allocated} to ${newAsset}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokens_allocated,
                newAsset,
                allocation.vesting_category_type,
                allocation.vesting_category_type
            );
        });

        const proposalName = Name.from(`${options.proposalName}${toBase6Plus1(Math.floor(i / batchSize))}`);

        console.log(
            `Creating proposal ${proposalName.toString()} with ${actions.length} actions: ${i} - ${i + batchSize}`
        );
        console.log('----------------------------------------');
        proposals++;
        const proposalHash = await createProposal(
            options.proposer,
            proposalName,
            actions,
            options.privateKey,
            options.requested,
            options.dryRun
        );

        if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);

        console.log('----------------------------------------');
    }

    console.log(`Batch size: ${batchSize}`);
    console.log(`Proposals created: ${proposals}`);
    console.log(`Processed ${count} / ${missedAllocations.length} allocations`);
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
