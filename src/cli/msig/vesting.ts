import { Action, ActionType, Name, NameType } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import {
    assetToAmount,
    assetToDecimal,
    TONO_SEED_LATE_ROUND_PRICE,
    TONO_SEED_ROUND_PRICE,
    getTonomyContract,
    getVestingContract,
} from '../../sdk/services/blockchain';
import { AccountType, isErrorCode, SdkErrors, TonomyUsername } from '../../sdk';
import { getAccount, getAccountNameFromUsername, TONO_CURRENT_PRICE } from '../../sdk/services/blockchain';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import settings from '../settings';

export async function vestingMigrate(options: StandardProposalOptions) {
    // Testnet list
    const migrateAccounts = [
        'p42pwxofd1vy', // 36 allocations
        'pwgvt1xn4ce5', // 10 allocations
        'p2mbvozcqp2l', // 5 allocations
    ];

    const actions: ActionType[] = [];

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
    const uniqueHolders = await getVestingContract().getAllUniqueHolders();
    const allAllocations = await getVestingContract().getAllAllocations(uniqueHolders);

    const batchSize = 100;

    for (let i = 0; i < allAllocations.length; i += batchSize) {
        const batch = allAllocations.slice(i, i + batchSize);

        const actions: ActionType[] = batch.map((allocation) => {
            const newAmount = assetToDecimal(allocation.tokensAllocated).mul(priceMultiplier);
            const newAsset = `${newAmount.toFixed(6)} TONO`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} in category ${allocation.vestingCategoryType} from ${allocation.tokensAllocated} to ${newAsset}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokensAllocated,
                newAsset,
                allocation.vestingCategoryType,
                allocation.vestingCategoryType
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
    const people = await getTonomyContract().getAllPeople();
    const vestingHolders = await getVestingContract().getAllUniqueHolders();

    const peopleNotInVestingHolders: Set<string> = new Set();

    for (const person of people) {
        if (!vestingHolders.has(person.accountName.toString())) {
            peopleNotInVestingHolders.add(person.accountName.toString());
        }
    }

    const missedAllocations = await getVestingContract().getAllAllocations(peopleNotInVestingHolders);

    const batchSize = 100;

    for (let i = 0; i < missedAllocations.length; i += batchSize) {
        const batch = missedAllocations.slice(i, i + batchSize);

        const actions: Action[] = batch.map((allocation) => {
            const newAmount = assetToDecimal(allocation.tokensAllocated).mul(priceMultiplier);
            const newAsset = `${newAmount.toFixed(6)} TONO`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} in category ${allocation.vestingCategoryType} from ${allocation.tokensAllocated} to ${newAsset}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokensAllocated,
                newAsset,
                allocation.vestingCategoryType,
                allocation.vestingCategoryType
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

export async function vestingMigrate4(options: StandardProposalOptions) {
    let count = 0;
    let proposals = 0;
    const multipliers = new Map<number, number>([
        [7, 6.0], // Community and Marketing, Platform Dev, Infra Rewards
        [8, 1.5], // Seed
        [9, 3.0], // Pre-sale
        [11, 6.0], // Private Sale
        [15, 1.5], // Special
    ]);
    // map username > allocation ID > multiplier
    const multiplierOverrides = new Map<string, Map<number, number>>([
        // Team allocation in category 7 should only be multiplied by 1.5
        ['pegcnjcnnaqd', new Map([[2, 1.5]])],
        ['pdbma2o2zalz', new Map([[0, 1.5]])],
        ['pxofpde2rzz3', new Map([[0, 1.5]])],
        ['pnkhrwvpnjne', new Map([[0, 1.5]])],
        ['pczkpas1xwgy', new Map([[0, 1.5]])],
        ['pdwxshjdhapd', new Map([[0, 1.5]])],
        ['p3quckancxou', new Map([[0, 1.5]])],
        ['pydft3snil3d', new Map([[0, 1.5]])],
        ['putzvkbtugyc', new Map([[0, 1.5]])],
        ['p1wrsvrvhd1', new Map([[0, 1.5]])],
        ['pb1wegfo2rsk', new Map([[0, 1.5]])],
        // Network operators in category 7 should only be multiplied by 1.5
        ['pzqi3jdfewjf', new Map([[0, 1.5]])],
        ['pjoqns2tjrao', new Map([[0, 1.5]])],
        ['pvijs1a5fwjp', new Map([[1, 1.5]])],
        ['p4lojkytrjql', new Map([[0, 1.5]])],
        ['team.tmy', new Map([[0, 1.5]])],
        // Fiddl.art grant in category 7 should only be multiplied by 3.0
        ['p44yuopaawi3', new Map([[0, 3.0]])],
    ]);
    const uniqueHolders = await getVestingContract().getAllUniqueHolders();
    const allAllocations = await getVestingContract().getAllAllocations(uniqueHolders);

    function getMultiplier(
        categoryId: number,
        account: string,
        allocationId: number
    ): { multiplier: number; message: string } {
        const res = multipliers.get(categoryId);

        if (!res) throw new Error(`No multiplier for category ${categoryId}`);

        const override = multiplierOverrides.get(account)?.get(allocationId);

        if (override) {
            return { multiplier: override, message: `(override multiplier from ${res}x to ${override}x)` };
        }

        return { multiplier: res, message: `` };
    }

    const batchSize = 100;

    for (let i = 0; i < allAllocations.length; i += batchSize) {
        const batch = allAllocations.slice(i, i + batchSize);

        const actions: ActionType[] = batch.map((allocation) => {
            const { multiplier, message } = getMultiplier(
                allocation.vestingCategoryType,
                allocation.account,
                allocation.id
            );
            const newAmount = assetToDecimal(allocation.tokensAllocated).mul(multiplier);

            const newAsset = `${newAmount.toFixed(6)} TONO`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} with ${multiplier}x in category ${allocation.vestingCategoryType} from ${allocation.tokensAllocated} to ${newAsset}${message ? ': ' + message : ''}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokensAllocated,
                newAsset,
                allocation.vestingCategoryType,
                allocation.vestingCategoryType
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

async function createAccountActions(account: NameType): Promise<Action[]> {
    const allocations = await getVestingContract().getAllocations(account);

    const actions: Action[] = [];

    for (const allocation of allocations) {
        const oldCategory = allocation.vestingCategoryType;

        let newCategory = 8;
        let newAmount = 0;

        if (oldCategory === 1 || oldCategory === 2) {
            if (oldCategory === 1) {
                const oldTokenPrice = 0.002;
                const newTokenPrice = TONO_SEED_ROUND_PRICE;
                const amount = assetToAmount(allocation.tokensAllocated);

                newAmount = (amount * oldTokenPrice) / newTokenPrice;
            } else {
                const oldTokenPrice = 0.004;
                const newTokenPrice = TONO_SEED_LATE_ROUND_PRICE;
                const amount = assetToAmount(allocation.tokensAllocated);

                newAmount = (amount * oldTokenPrice) / newTokenPrice;

                newCategory = 9;
            }

            const oldAmount = allocation.tokensAllocated;
            const newAsset = `${newAmount.toFixed(6)} TONO`;

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
    holder: NameType,
    allocationId: number,
    oldAmount: string,
    newAmount: string,
    oldCategoryId: number,
    newCategoryId: number
) {
    return Action.from({
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
    });
}

export async function vestingBulk(args: { governanceAccounts: string[] }, options: StandardProposalOptions) {
    const csvFilePath = '/home/dev/Downloads/allocate.csv';

    console.log('Reading file: ', csvFilePath);
    const sender = settings.isProduction() ? 'advteam.tmy' : 'team.tmy';
    const requiredAuthority = options.autoExecute ? args.governanceAccounts[2] : '11.found.tmy';
    const categoryId = 7; // Community and Marketing, Platform Dev, Infra Rewards
    // https://github.com/Tonomy-Foundation/Tonomy-Contracts/blob/master/contracts/vesting.tmy/include/vesting.tmy/vesting.tmy.hpp#L31

    const records = parse(fs.readFileSync(csvFilePath, 'utf8'), {
        columns: true,
        // eslint-disable-next-line camelcase
        skip_empty_lines: true,
    });
    const results: { accountName: string; usdQuantity: number }[] = [];

    const unfoundAccounts: string[] = [];

    await Promise.all(
        records.map(async (data: any) => {
            // accountName, usdQuantity
            if (!data.accountName || !data.usdQuantity) {
                throw new Error(`Invalid CSV format on line ${results.length + 1}: ${data}`);
            }

            try {
                let accountName = data.accountName as string;

                if (accountName.startsWith('@')) {
                    const usernameInstance = TonomyUsername.fromUsername(
                        accountName.split('@')[1],
                        AccountType.PERSON,
                        settings.config.accountSuffix
                    );

                    accountName = (await getAccountNameFromUsername(usernameInstance)).toString();
                } else {
                    await getAccount(accountName);
                }

                data.accountName = accountName;

                data.usdQuantity = Number(data.usdQuantity);

                if (isNaN(data.usdQuantity)) {
                    throw new Error(`Invalid quantity type on line ${results.length + 1}: ${data}`);
                }

                if (data.usdQuantity <= 0 || data.usdQuantity > 100000) {
                    throw new Error(`Invalid quantity on line ${results.length + 1}: ${data}`);
                }

                results.push(data);
            } catch (e) {
                if (isErrorCode(e, [SdkErrors.AccountDoesntExist, SdkErrors.UsernameNotFound])) {
                    unfoundAccounts.push(data.accountName);
                } else {
                    throw e;
                }
            }
        })
    );

    if (unfoundAccounts.length > 0) {
        console.error(
            `${unfoundAccounts.length} accounts were not found in environment ${settings.env}:`,
            unfoundAccounts
        );
        process.exit(1);
    }

    const actions = results.map((data) => {
        const tonoNumber = data.usdQuantity / TONO_CURRENT_PRICE;

        const tonoQuantity = tonoNumber.toFixed(0) + '.000000 TONO';

        console.log(
            `Assigning: ${tonoQuantity} ($${data.usdQuantity} USD) vested in category ${categoryId} to ${data.accountName} at rate of $${TONO_CURRENT_PRICE}/TONO`
        );
        return getVestingContract().actions.assignTokens({
            sender,
            holder: data.accountName,
            amount: tonoQuantity,
            category: categoryId,
        });
    });

    console.log(`Total ${actions.length} accounts to be paid`);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [requiredAuthority],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
