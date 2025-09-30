import { Action, ActionType, Name, NameType } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import {
    assetToAmount,
    assetToDecimal,
    TONO_SEED_LATE_ROUND_PRICE,
    TONO_SEED_ROUND_PRICE,
    getTonomyContract,
    getVestingContract,
    getTokenContract,
    getStakingContract,
    StakingContract,
    amountToAsset,
} from '../../sdk/services/blockchain';
import { AccountType, isErrorCode, SdkErrors, TonomyUsername } from '../../sdk';
import {
    getAccount,
    getAccountNameFromUsername,
    TONO_CURRENT_PRICE,
    vestingCategories as vestingSchedules,
} from '../../sdk/services/blockchain';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import settings from '../settings';
import Decimal from 'decimal.js';
import { bulkTransfer } from './token';

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

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
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

async function vestingMigrate4Vesting(options: StandardProposalOptions) {
    let count = 0;
    let proposals = 0;
    // categoryId -> multiplier, newCategoryId
    const multipliers = new Map<number, { multiplier: number; newCategoryId: number }>([
        [7, { multiplier: 6.0, newCategoryId: 7 }], // Community and Marketing, Platform Dev, Infra Rewards
        [8, { multiplier: 1.5, newCategoryId: 16 }], // Seed
        [9, { multiplier: 3.0, newCategoryId: 17 }], // Pre-sale
        [11, { multiplier: 6.0, newCategoryId: 18 }], // Private Sale
        [15, { multiplier: 1.5, newCategoryId: 19 }], // Special
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
    ): { multiplier: number; message: string; newCategoryId: number } {
        const res = multipliers.get(categoryId);

        if (!res) throw new Error(`No multiplier for category ${categoryId}`);

        const override = multiplierOverrides.get(account)?.get(allocationId);

        if (override) {
            return {
                multiplier: override,
                message: `(override multiplier from ${res.multiplier.toFixed(1)}x to ${override.toFixed(1)}x)`,
                newCategoryId: res.newCategoryId,
            };
        }

        return { multiplier: res.multiplier, message: ``, newCategoryId: res.newCategoryId };
    }

    const batchSize = 100;

    for (let i = 0; i < allAllocations.length; i += batchSize) {
        const batch = allAllocations.slice(i, i + batchSize);

        const actions: ActionType[] = batch.map((allocation) => {
            const { multiplier, message, newCategoryId } = getMultiplier(
                allocation.vestingCategoryType,
                allocation.account,
                allocation.id
            );
            const newAmount = assetToDecimal(allocation.tokensAllocated).mul(multiplier);

            const newAsset = `${newAmount.toFixed(6)} TONO`;

            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} with ${multiplier}x in category ${allocation.vestingCategoryType} from ${allocation.tokensAllocated} to ${newAsset} in category ${newCategoryId}${message ? ': ' + message : ''}`
            );
            count++;

            return createMigrateAction(
                'coinsale.tmy',
                allocation.holder,
                allocation.id,
                allocation.tokensAllocated,
                newAsset,
                allocation.vestingCategoryType,
                newCategoryId
            );
        });

        const proposalName = Name.from(`${options.proposalName}v${toBase6Plus1(Math.floor(i / batchSize))}`);

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

// https://docs.google.com/spreadsheets/d/159Tg4nBDud-uaRMsaP1sMtZgzG3JAw4FjvRWAJ44J8I/edit?gid=2036125243#gid=2036125243&range=A39
async function vestingMigrate4Tokenomics(options: StandardProposalOptions) {
    // to, from, amount
    const transfers: [string, string, Decimal][] = [
        ['ecosystm.tmy', 'coinsale.tmy', new Decimal('6345000000.000000')],
        ['ecosystm.tmy', 'liquidty.tmy', new Decimal('655000000.000000')],
        ['infra.tmy', 'liquidty.tmy', new Decimal('2500000000.000000')],
        ['marketng.tmy', 'liquidty.tmy', new Decimal('2500000000.000000')],
        ['ops.tmy', 'liquidty.tmy', new Decimal('750000000.000000')],
        ['partners.tmy', 'liquidty.tmy', new Decimal('1000000000.000000')],
        ['reserves.tmy', 'liquidty.tmy', new Decimal('500000000.000000')],
        ['team.tmy', 'liquidty.tmy', new Decimal('1500000000.000000')],
    ];
    const proposalName = Name.from(options.proposalName.toString() + 't1');

    await bulkTransfer({ transfers, ...options, proposalName });
}

// https://docs.google.com/spreadsheets/d/159Tg4nBDud-uaRMsaP1sMtZgzG3JAw4FjvRWAJ44J8I/edit?gid=2036125243#gid=2036125243&range=E39
async function vestingMigrate4TokenFixes(options: StandardProposalOptions) {
    // to, from, amount
    const transfers: [string, string, Decimal][] = [
        ['team.tmy', 'coinsale.tmy', new Decimal('150310000.000000')],
        ['team.tmy', 'coinsale.tmy', new Decimal('1080233320.000000')],
        ['infra.tmy', 'coinsale.tmy', new Decimal('103875000.000000')],
        ['team.tmy', 'coinsale.tmy', new Decimal('250000000.000000')],
        ['marketng.tmy', 'team.tmy', new Decimal('216046664.000000')],
        ['partners.tmy', 'team.tmy', new Decimal('50000000.000000')],
        ['reserves.tmy', 'coinsale.tmy', new Decimal('136893689.000000')],
    ];
    const proposalName = Name.from(options.proposalName.toString() + 't2');

    await bulkTransfer({ transfers, ...options, proposalName });
}

async function burnBaseTokens(options: StandardProposalOptions) {
    const burnAction = getTokenContract().actions.bridgeRetire({
        from: 'coinsale.tmy',
        quantity: '3000000000.000000 TONO',
        memo: 'Burn tokens that will be minted on Base blockchain',
    });

    console.log(
        'Burning 3,000,000,000.000000 TONO from the coinsale.tmy account, that will be minted on Base blockchain'
    );
    const proposalName = Name.from(options.proposalName.toString() + 'burn');

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        [burnAction],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

async function vestAllTreasuries(options: StandardProposalOptions) {
    const vestingCategories = new Map<string, number>([
        ['ecosystm.tmy', 7],
        ['infra.tmy', 7],
        ['liquidty.tmy', 14],
        ['marketng.tmy', 7],
        ['ops.tmy', 7],
        ['partners.tmy', 6],
        ['reserves.tmy', 6],
        ['team.tmy', 4],
    ]);

    const actions: Action[] = [];

    for (const [account, category] of vestingCategories) {
        let balance = await getTokenContract().getBalanceDecimal(account);

        if (account === 'liquidty.tmy') {
            // liquidity treasury has to distribute tokens to some partners (e.g. market maker before TGE so we vest only the vesting part
            // The vested part has the %TGE unlocked removed in the vesting schedule at accommodate for this
            const vesting = vestingSchedules.get(category);

            if (!vesting) throw new Error(`No vesting schedule for category ${category}`);

            balance = balance.mul(1 - 0.25); // 25% TGE unlocked
        }

        console.log(`Vesting ${balance.toFixed(6)} TONO for ${account} in category ${category}`);

        actions.push(
            getVestingContract().actions.assignTokens({
                sender: account,
                holder: account,
                amount: `${balance.toFixed(6)} TONO`,
                category,
            })
        );
    }

    const proposalName = Name.from(options.proposalName.toString() + 'vest');

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function vestingMigrationBulk(options: StandardProposalOptions) {
    // https://docs.google.com/spreadsheets/d/159Tg4nBDud-uaRMsaP1sMtZgzG3JAw4FjvRWAJ44J8I/edit?gid=1969710758#gid=1969710758&range=A1

    const proposalName = Name.from(options.proposalName.toString() + 'bulk');

    await vestingBulk({ ...options, proposalName });
}

async function setupStaking(options: StandardProposalOptions) {
    const yearlyStakePool = StakingContract.yearlyStakePool;
    const monthsToFund = 1;
    const setupAction = getStakingContract().actions.setSettings({
        yearlyStakePool: amountToAsset(yearlyStakePool, 'TONO'),
    });
    const addYieldAction = getStakingContract().actions.addYield({
        sender: 'infra.tmy',
        quantity: amountToAsset((yearlyStakePool * monthsToFund) / 12, 'TONO'), // one month of yield
    });
    const actions = [setupAction, addYieldAction];

    console.log(
        `Setting up staking with a yearly stake pool of ${amountToAsset(yearlyStakePool, 'TONO')} with:\n
        - target of ${(StakingContract.STAKING_APY_TARGET * 100).toFixed(2)}% APY\n
        - and ${monthsToFund} month(s) of yield ${amountToAsset((yearlyStakePool * monthsToFund) / 12, 'TONO')} from infra.tmy`
    );
    const proposalName = Name.from(options.proposalName.toString() + 'stake');

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function vestingMigrate4(options: StandardProposalOptions) {
    await vestingMigrate4Vesting(options);
    await vestingMigrate4Tokenomics(options);
    await vestingMigrate4TokenFixes(options);
    await vestingMigrationBulk(options); // pre TGE allocations
    await burnBaseTokens(options);
    await setupStaking(options);
    await vestAllTreasuries(options); // should only be called once all above proposals are executed
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
): Action {
    return getVestingContract().actions.migrateAlloc({
        sender,
        holder,
        allocationId,
        oldAmount,
        newAmount,
        oldCategoryId,
        newCategoryId,
    });
}

async function fetchAccountNameFromUsername(accountName: string): Promise<string> {
    const usernameInstance = TonomyUsername.fromUsername(
        accountName,
        AccountType.PERSON,
        settings.config.accountSuffix
    );

    return (await getAccountNameFromUsername(usernameInstance)).toString();
}

export async function vestingBulk(options: StandardProposalOptions) {
    const csvFilePath = '/home/dev/Downloads/allocate.csv';

    console.log('Reading file: ', csvFilePath);

    const records: any[] = parse(fs.readFileSync(csvFilePath, 'utf8'), {
        columns: true,
        // eslint-disable-next-line camelcase
        skip_empty_lines: true,
    });
    const results: { sender: string; accountName: string; usdQuantity: number; categoryId: number }[] = [];

    const unfoundAccounts: string[] = [];

    console.log('Processing ', records.length, ' records');

    // split the record array into batches of 100
    const recordBatches = [];

    for (let i = 0; i < records.length; i += 100) {
        recordBatches.push(records.slice(i, i + 100));
    }

    for (let i = 0; i < recordBatches.length; i++) {
        const batch = recordBatches[i];

        console.log(`Processing batch ${i + 1} / ${recordBatches.length} with ${batch.length} records`);
        await Promise.all(
            batch.map(async (data: any) => {
                // accountName, usdQuantity, categoryId, sender
                if (!data.sender || !data.accountName || !data.usdQuantity || !data.categoryId) {
                    throw new Error(`Invalid CSV format on line ${results.length + 1}: ${JSON.stringify(data)}`);
                }

                try {
                    let accountName = data.accountName as string;

                    // First assume that @... is a username and without @ is an account name, but if this fails try the other way around
                    if (accountName.startsWith('@')) {
                        accountName = accountName.split('@')[1];

                        try {
                            accountName = await fetchAccountNameFromUsername(accountName);
                        } catch (e) {
                            if (isErrorCode(e, [SdkErrors.AccountDoesntExist, SdkErrors.UsernameNotFound])) {
                                await getAccount(accountName);
                            } else {
                                throw e;
                            }
                        }
                    } else {
                        try {
                            await getAccount(accountName);
                        } catch (e) {
                            if (isErrorCode(e, [SdkErrors.AccountDoesntExist, SdkErrors.UsernameNotFound])) {
                                accountName = await fetchAccountNameFromUsername(accountName);
                            } else {
                                throw e;
                            }
                        }
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
                        console.error(`Error processing line ${results.length + 1}: ${JSON.stringify(data)}`, e);
                        throw e;
                    }
                }
            })
        );
    }

    if (unfoundAccounts.length > 0) {
        console.error(
            `${unfoundAccounts.length} accounts were not found in environment ${settings.env}: ${unfoundAccounts.join(', ')}`
        );
        process.exit(1);
    }

    const totalTonomyUsd = results.reduce((sum, record) => sum + record.usdQuantity, 0);

    console.log(`Total USD to be vested: $${totalTonomyUsd.toFixed(2)} USD`);
    console.log(`Using TONO price of $${TONO_CURRENT_PRICE} USD`);
    console.log(`Total TONO to be vested: ${(totalTonomyUsd / TONO_CURRENT_PRICE).toFixed(0)} TONO`);
    const actions = results.map((data) => {
        const tonoNumber = data.usdQuantity / TONO_CURRENT_PRICE;

        const tonoQuantity = tonoNumber.toFixed(0) + '.000000 TONO';

        console.log(
            `Assigning: ${tonoQuantity} ($${data.usdQuantity} USD) vested in category ${data.categoryId} from ${data.sender} to ${data.accountName} at rate of $${TONO_CURRENT_PRICE}/TONO`
        );
        return getVestingContract().actions.assignTokens({
            sender: data.sender,
            holder: data.accountName,
            amount: tonoQuantity,
            category: data.categoryId,
        });
    });

    console.log(`Total ${actions.length} accounts to be paid`);

    // Approximately each `assignToken()` action is 159 us CPU. See https://explorer.tonomy.io/transaction/58f74568c9657f6b9c6b71995a4a24f97d33b051f8bc758b8593bee79fb1c71e?tab=raw
    // Each block is 0.5s and can be filled with 200000 us CPU
    // Therefore we can fit approximately 1260 actions in a single block
    // But to be safe we will use 1000 actions per proposal
    const actionsPerProposal = 1000;
    const actionBatches = [];

    for (let i = 0; i < actions.length; i += actionsPerProposal) {
        actionBatches.push(actions.slice(i, i + actionsPerProposal));
    }

    console.log(`Creating ${actionBatches.length} proposals with up to ${actionsPerProposal} actions each`);

    for (let i = 0; i < actionBatches.length; i++) {
        const batch = actionBatches[i];
        const batchProposalName =
            actionBatches.length === 1
                ? options.proposalName
                : Name.from(options.proposalName.toString() + toBase6Plus1(i));

        console.log(`Creating proposal ${i + 1} / ${actionBatches.length} with ${batch.length} actions`);

        const proposalHash = await createProposal(
            options.proposer,
            batchProposalName,
            batch,
            options.privateKey,
            options.requested,
            options.dryRun
        );

        if (!options.dryRun && options.autoExecute)
            await executeProposal(options.proposer, batchProposalName, proposalHash);
    }
}
