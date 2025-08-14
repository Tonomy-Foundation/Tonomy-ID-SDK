import { Authority, tonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function newAccount(args: { governanceAccounts: string[] }, options: StandardProposalOptions) {
    const accountName = 'mexctesttest';
    const ownerKey = 'EOS6ASYi2oDnRwNw16MYMs3jUe3TPCo1mNjNxQ1qaDZBaeqtREHDq';
    const activeKey = 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB';

    const owner = Authority.fromKey(ownerKey).addAccount({
        actor: 'gov.tmy',
        permission: 'active',
    });
    const active = Authority.fromKey(activeKey).addAccount({
        actor: 'gov.tmy',
        permission: 'active',
    });

    const action = tonomyEosioProxyContract.actions.newAccount({
        creator: 'tonomy',
        name: accountName,
        owner: owner,
        active: active,
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
