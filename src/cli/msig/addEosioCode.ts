import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';
import { addCodePermissionTo } from '../bootstrap';

export async function addEosioCode(options: StandardProposalOptions) {
    const actions = [];

    const accountsToUpdate = [...addCodePermissionTo, 'advteam.tmy'];

    for (const account of accountsToUpdate) {
        const accountInfo = await getAccountInfo(Name.from(account));

        const ownerPermission = accountInfo.getPermission('owner');
        const activePermission = accountInfo.getPermission('active');

        const ownerAuthority = Authority.fromAccountPermission(ownerPermission);
        const activeAuthority = Authority.fromAccountPermission(activePermission);

        activeAuthority.addCodePermission('vesting.tmy');
        activeAuthority.addCodePermission('staking.tmy');
        ownerAuthority.addCodePermission('vesting.tmy');
        ownerAuthority.addCodePermission('staking.tmy');

        actions.push({
            account: 'tonomy',
            name: 'updateauth',
            authorization: [
                {
                    actor: account,
                    permission: 'owner',
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
                account: account,
                permission: 'owner',
                parent: '',
                auth: ownerAuthority,
                // eslint-disable-next-line camelcase
                auth_parent: false,
            },
        });

        actions.push({
            account: 'tonomy',
            name: 'updateauth',
            authorization: [
                {
                    actor: account,
                    permission: 'active',
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
                account: account,
                permission: 'active',
                parent: 'owner',
                auth: activeAuthority,
                // eslint-disable-next-line camelcase
                auth_parent: false,
            },
        });
    }

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
