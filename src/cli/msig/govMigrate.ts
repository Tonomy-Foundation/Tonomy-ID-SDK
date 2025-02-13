import settings from '../bootstrap/settings';
import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

export async function govMigrate(args: { newGovernanceAccounts: string[] }, options: StandardProposalOptions) {
    const threshold = settings.isProduction() ? 3 : 2;
    const action = {
        account: 'tonomy',
        name: 'updateauth',
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
        data: {
            account: 'found.tmy',
            permission: 'owner',
            parent: '',
            auth: Authority.fromAccountArray(args.newGovernanceAccounts, 'active', threshold),
            // eslint-disable-next-line camelcase
            auth_parent: false, // should be true when a new permission is being created, otherwise false
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
