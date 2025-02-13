/* eslint-disable camelcase */
import { TOTAL_RAM_AVAILABLE, RAM_FEE, RAM_PRICE } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function setResourceConfig(args, options: StandardProposalOptions) {
    const action = {
        authorization: [
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        account: 'tonomy',
        name: 'setresparams',
        data: {
            ram_price: RAM_PRICE,
            total_ram_available: TOTAL_RAM_AVAILABLE,
            ram_fee: RAM_FEE,
        },
    };
    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested
    );

    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
