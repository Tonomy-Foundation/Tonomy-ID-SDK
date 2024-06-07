import { EosioTokenContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from ".";

export async function transfer(args: { to: string, from: string }, options: StandardProposalOptions) {
    const amountUsd = 100000;
    const price = 0.012;
    const amount = amountUsd / price;
    const quantity = amount.toFixed(0) + '.000000 LEOS';

    const balance = await EosioTokenContract.Instance.getBalance(args.from);

    if (balance < amount) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
    }

    const action = {
        account: 'eosio.token',
        name: 'transfer',
        authorization: [
            {
                actor: args.from,
                permission: 'active',
            },
        ],
        data: {
            from: args.from,
            to: args.to,
            quantity,
            memo: '',
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}