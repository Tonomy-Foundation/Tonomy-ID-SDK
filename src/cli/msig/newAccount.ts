import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

export async function newAccount(options: StandardProposalOptions) {
    const accountName = 'login.hypha';

    const active = Authority.fromKey('EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB');

    active.addAccount({ actor: 'gov.tmy', permission: 'active' });

    const owner = active;

    const action = {
        account: 'tonomy',
        name: 'newaccount',
        authorization: [
            {
                actor: 'tonomy',
                permission: 'owner',
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        data: {
            creator: 'tonomy',
            name: accountName,
            owner,
            active,
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
