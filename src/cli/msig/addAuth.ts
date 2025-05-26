import { Authority, tonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';

export async function addAuth(
    args: { account: string; permission: string; newDelegate: string; useParentAuth: boolean },
    options: StandardProposalOptions
) {
    const accountInfo = await getAccountInfo(Name.from(args.account));
    const perm = accountInfo.getPermission(args.permission);
    const newAuthority = Authority.fromAccountPermission(perm);

    newAuthority.addAccount({ actor: args.newDelegate, permission: 'active' });

    const permission = (args.useParentAuth ?? false) ? perm.parent.toString() : args.permission;

    const action = tonomyEosioProxyContract.actions.updateauth({
        account: args.account,
        permission: args.permission,
        parent: perm.parent,
        auth: newAuthority,
        authParent: args.useParentAuth ?? false,
    });

    const requested = [...options.requested, { actor: args.account, permission }];

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
