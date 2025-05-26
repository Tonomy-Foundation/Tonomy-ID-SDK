import settings from '../settings';
import { Authority, tonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

export async function govMigrate(args: { newGovernanceAccounts: string[] }, options: StandardProposalOptions) {
    const threshold = settings.isProduction() ? 3 : 2;
    const action = tonomyEosioProxyContract.actions.updateauth({
        account: 'found.tmy',
        permission: 'owner',
        parent: '',
        auth: Authority.fromAccountArray(args.newGovernanceAccounts, 'active', threshold),
        authParent: false, // should be true when a new permission is being created, otherwise false
    });
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
