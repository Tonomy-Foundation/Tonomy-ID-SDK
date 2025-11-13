import { amountToSupplyPercentage, assetToDecimal, getAccount, getTokenContract } from '../../sdk/services/blockchain';
// import { TONO_PUBLIC_SALE_PRICE } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import Decimal from 'decimal.js';
import { Action } from '@wharfkit/antelope';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { getSettings, isErrorCode, SdkErrors } from '../../sdk';
import { fetchAccountNameFromUsername } from './vesting';

export async function transfer(options: StandardProposalOptions) {
    const from = 'ecosystm.tmy';
    const to = 'coinsale.tmy';
    // const amountUsd = 100000;
    // const price = TONO_PUBLIC_SALE_PRICE;
    // const amount = amountUsd / price;
    // const quantity = amount.toFixed(0) + '.000000 TONO';
    const quantity = '5000000000.000000 TONO';
    const amount = assetToDecimal(quantity);
    const balance = await getTokenContract().getBalanceDecimal(from);

    if (balance.lessThan(amount)) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
    }

    const fraction = amountToSupplyPercentage(amount);

    console.log(`Transferring ${quantity} (${fraction}) from ${from} to ${to}`);

    const action = getTokenContract().actions.transfer({ from, to, quantity });

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
/**
 * Proposes multiple token transfers in a single multisig proposal.
 *
 * @param options.transfers Array of [from, to, amount]
 */
export async function bulkTransfer(options: StandardProposalOptions & { transfers?: [string, string, Decimal][] }) {
    const actions: Action[] = [];

    const price = 0.00005492; // https://www.coingecko.com/en/coins/tonomy

    if (!options.transfers || options.transfers.length === 0) {
        options.transfers = (await getTransfersFromFile()).map(({ sender, accountName, usdQuantity }) => [
            sender,
            accountName,
            new Decimal(usdQuantity).div(price),
        ]);
    }

    for (const [from, to, amount] of options.transfers) {
        const balance = await getTokenContract().getBalanceDecimal(from);

        if (balance.lessThan(amount)) {
            throw new Error(`Insufficient balance on account ${from}. Required: ${amount}, Available: ${balance}`);
        }

        const fraction = amountToSupplyPercentage(amount);

        console.log(`Transferring ${amount} TONO (${fraction}) from ${from} to ${to}`);

        const action = getTokenContract().actions.transfer({
            from,
            to,
            quantity: amount.toFixed(6) + ' TONO',
            memo: 'Migrating tokenomics to v30',
        });

        actions.push(action);
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

async function getTransfersFromFile(): Promise<{ sender: string; accountName: string; usdQuantity: number }[]> {
    const csvFilePath = '/home/dev/Downloads/transfers.csv';

    console.log('Reading file: ', csvFilePath);

    const records: any[] = parse(fs.readFileSync(csvFilePath, 'utf8'), {
        columns: true,
        // eslint-disable-next-line camelcase
        skip_empty_lines: true,
    });
    const results: { sender: string; accountName: string; usdQuantity: number }[] = [];

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
                // accountName, usdQuantity, sender
                if (!data.sender || !data.accountName || !data.usdQuantity) {
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
            `${unfoundAccounts.length} accounts were not found in environment ${getSettings().environment}: ${unfoundAccounts.join(', ')}`
        );
        process.exit(1);
    }

    return results;
}

export async function setStats(options: StandardProposalOptions) {
    const action = getTokenContract().actions.setStats({});

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
