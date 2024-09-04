import { ramAvailable, ramFee, ramPrice } from '../../sdk/services/blockchain';
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
            ram_price: ramPrice,
            total_ram_available: ramAvailable,
            ram_fee: ramFee,
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
