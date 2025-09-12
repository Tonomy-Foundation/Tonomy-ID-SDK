import { amountToSupplyPercentage, assetToDecimal, getTokenContract } from '../../sdk/services/blockchain';
// import { TONO_PUBLIC_SALE_PRICE } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import Decimal from 'decimal.js';
import { Action } from '@wharfkit/antelope';

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
export async function bulkTransfer(options: StandardProposalOptions & { transfers: [string, string, Decimal][] }) {
    const actions: Action[] = [];

    for (const [from, to, amount] of options.transfers) {
        const balance = await getTokenContract().getBalanceDecimal(from);

        if (balance.lessThan(amount)) {
            throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
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
