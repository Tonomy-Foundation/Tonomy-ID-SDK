import { ActionData, Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';

export async function addAuth(
    args: { account: string; permission: string; newDelegate: string },
    options: StandardProposalOptions
) {
    const accountInfo = await getAccountInfo(Name.from(args.account));
    const perm = accountInfo.getPermission(args.permission);
    const newAuthority = Authority.fromAccountPermission(perm);

    newAuthority.addAccount({ actor: args.newDelegate, permission: 'active' });

    const action: ActionData = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: args.account,
                permission: args.permission,
            },
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
            account: args.account,
            permission: args.permission,
            parent: perm.parent,
            auth: newAuthority,
            // eslint-disable-next-line camelcase
            auth_parent: false,
        },
    };

    const requested = [...options.requested, { actor: args.account, permission: args.permission }];

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
