import { defaultBlockchainParams } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function setBlockchainConfig(args, options: StandardProposalOptions) {
    const action = {
        authorization: [
            {
                actor: 'tonomy',
                permission: 'active',
            },
            {
                actor: 'tonomy',
                permission: 'owner',
            },
        ],
        account: 'tonomy',
        name: 'setparams',
        data: { params: defaultBlockchainParams },
    };
    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (proposalHash && options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
