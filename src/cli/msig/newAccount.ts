import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from ".";

export async function newAccount(args: { governanceAccounts: string[]; }, options: StandardProposalOptions) {
    const newAccount = 'advteam.tmy';

    const activeAuth = Authority.fromAccount({ actor: 'team.tmy', permission: 'active' });
    const additionalAuthority = options.test ? args.governanceAccounts[2] : '11.found.tmy';

    activeAuth.addAccount({ actor: additionalAuthority, permission: 'active' });
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
            name: newAccount,
            owner: Authority.fromAccount({ actor: 'team.tmy', permission: 'owner' }),
            active: activeAuth,
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