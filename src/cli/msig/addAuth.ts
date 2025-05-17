import { ActionData, Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';

export async function updateAuth(options: StandardProposalOptions) {
    const account = 'bridge.cxc';
    const permission = 'active';
    const newDelegate = 'gov.tmy';
    const useParentAuth = true;

    const accountInfo = await getAccountInfo(Name.from(account));
    const perm = accountInfo.getPermission(permission);
    const newAuthority = Authority.fromAccountPermission(perm);

    newAuthority.addAccount({ actor: newDelegate, permission: 'active' });
    // const newAuthority = Authority.fromAccount({ actor: 'found.tmy', permission: 'active' });

    const authPermission = (useParentAuth ?? false) ? perm.parent.toString() : permission;

    const action: ActionData = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: account,
                permission: authPermission,
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
            // {
            //     actor: 'tonomy',
            //     permission: 'owner',
            // },
        ],
        data: {
            account,
            permission,
            parent: perm.parent,
            auth: newAuthority,
            // eslint-disable-next-line camelcase
            auth_parent: useParentAuth ?? false,
        },
    };

    // const requested = [...options.requested, { actor: account, permission: authPermission }];
    const requested = options.requested;
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
