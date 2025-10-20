import { amountToSupplyPercentage, assetToDecimal, getTokenContract } from '../../sdk/services/blockchain';
// import { TONO_PUBLIC_SALE_PRICE } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import Decimal from 'decimal.js';
import { Action } from '@wharfkit/antelope';
import { getSettings } from '../../sdk';
import { ethers } from 'ethers';

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

export async function crossChainSwap(options: StandardProposalOptions) {
    const from = 'liquidty.tmy';
    const quantity = new Decimal(10);
    const memo = 'cross chain swap by Governance Council';
    const action = getTokenContract().actions.bridgeRetire({ from, quantity: quantity.toFixed(6) + ' TONO', memo });

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

    const baseTokenAddress = getSettings().baseTokenAddress;
    const governaceDAOAddress = `0x8951e9D016Cc0Cf86b4f6819c794dD64e4C3a1A1`;
    const amountUint256 = ethers.parseEther(quantity.toFixed(6)).toString();

    console.log('');
    console.log('Now you also need to create the equivalent `bridgeMint()` transaction via the Base DAO:');
    console.log(
        `1. go to https://app.safe.global/apps/open?safe=base:${baseTokenAddress}&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder`
    );
    console.log(
        `2. Copy to the "Enter ABI" field: the [] array found on the "abi" property in ./Ethereum-token/artifacts/contracts/TonomyToken.sol/TonomyToken.json`
    );
    console.log(`3. enter the details:`);
    console.log(`  Contract Method: bridgeMint()`);
    console.log(`  to (address): ${governaceDAOAddress}(which is the Governance DAO address)`);
    console.log(`  amount (uint256): ${amountUint256}`);
    console.log(`4. Click "Add new transaction"`);
    console.log(`5. Click "Send batch"`);
    console.log(`6. Click "Continue"`);
    console.log(`7. Click "Sign"`);
}
