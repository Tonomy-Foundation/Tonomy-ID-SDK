import { Authority, getTonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';
import settings from '../settings';
import { addCodePermissionTo } from '../bootstrap';

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

    const action = getTonomyEosioProxyContract().actions.updateAuth({
        account,
        permission,
        parent: perm.parent,
        auth: newAuthority,
        authParent: useParentAuth ?? false,
    });

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

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

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

        actions.push(
            getTonomyEosioProxyContract().actions.updateAuth({
                account,
                permission: 'owner',
                parent: '',
                auth: ownerAuthority,
                authParent: false,
            })
        );

        actions.push(
            getTonomyEosioProxyContract().actions.updateAuth({
                account,
                permission: 'active',
                parent: 'owner',
                auth: activeAuthority,
                authParent: false,
            })
        );
    }

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function govMigrate(args: { newGovernanceAccounts: string[] }, options: StandardProposalOptions) {
    const threshold = settings.isProduction() ? 3 : 2;
    const action = getTonomyEosioProxyContract().actions.updateAuth({
        account: 'found.tmy',
        permission: 'owner',
        parent: '',
        auth: Authority.fromAccountArray(args.newGovernanceAccounts, 'active', threshold),
        authParent: false,
    });

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
