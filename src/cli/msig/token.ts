import { amountToSupplyPercentage, assetToDecimal, EosioTokenContract } from '../../sdk/services/blockchain';
// import { TONO_PUBLIC_SALE_PRICE } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

export async function transfer(options: StandardProposalOptions) {
    const from = 'ecosystm.tmy';
    const to = 'coinsale.tmy';
    // const amountUsd = 100000;
    // const price = TONO_PUBLIC_SALE_PRICE;
    // const amount = amountUsd / price;
    // const quantity = amount.toFixed(0) + '.000000 TONO';
    const quantity = '5000000000.000000 TONO';
    const amount = assetToDecimal(quantity);
    const balance = await EosioTokenContract.Instance.getBalanceDecimal(from);

    if (balance.lessThan(amount)) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
    }

    const fraction = amountToSupplyPercentage(amount);

    console.log(`Transferring ${quantity} (${fraction}) from ${from} to ${to}`);

    const action = {
        account: 'eosio.token',
        name: 'transfer',
        authorization: [
            {
                actor: from,
                permission: 'active',
            },
        ],
        data: {
            from,
            to,
            quantity,
            memo: '',
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
