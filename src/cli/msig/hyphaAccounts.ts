import {  Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { getAccountInfo } from '../../sdk';
import { Name } from '@wharfkit/antelope';

export async function createHyphaAccounts( options: StandardProposalOptions) {
    const accountNames = [
        'dao.hypha',
        'voice.hypha',
        'hypha.hypha',
        'husd.hypha',
        'kv.hypha' ,
        'join.hypha',
        'srvice.hypha',
    ];

    // Use provided accountKey or default
    const accountKey = 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB';

    const actions = accountNames.map(accountName => {
        // Create owner and active authorities
        const ownerAuth = Authority.fromKey(accountKey);
        const activeAuth = Authority.fromKey(accountKey);

        // Add code permissions for the account
        ownerAuth.addCodePermission(accountName);
        activeAuth.addCodePermission(accountName);

        return {
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
                owner: ownerAuth,
                active: activeAuth,
            },
        };
    });

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function updateAccountPermissions(options: StandardProposalOptions) {
    const accountNames = [
        {
            name: 'dao.hypha', permission:'active',
        }
       
    ];

    const actions = await Promise.all(accountNames.flatMap(async (account) => {
        const accountInfo = await getAccountInfo(Name.from(account.name));
        const perm = accountInfo.getPermission(account.permission);
        const newAuthority = Authority.fromAccountPermission(perm);
    
        newAuthority.addAccount({ actor: 'dao.hypha', permission: 'owner' });
    
        return  {
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
                account: account.name,
                permission: account.permission,
                parent: perm.parent,
                auth: newAuthority,
                // eslint-disable-next-line camelcase
                auth_parent: false,
            }
        };
    }));

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
