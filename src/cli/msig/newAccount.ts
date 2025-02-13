import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function newAccount(args: { governanceAccounts: string[] }, options: StandardProposalOptions) {
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
        options.requested
    );

    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
