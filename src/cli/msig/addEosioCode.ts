import { amountToAsset, Authority, StakingContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name } from '@wharfkit/antelope';
import { getAccountInfo } from '../../sdk';

export async function addEosioCode(options: StandardProposalOptions) {
    const actions = [];

    const accountsToUpdate = ['staking.tmy', 'infra.tmy'];

    for (const account of accountsToUpdate) {
        const accountInfo = await getAccountInfo(Name.from(account));

        const ownerPermission = accountInfo.getPermission('owner');
        const activePermission = accountInfo.getPermission('active');

        const ownerAuthority = Authority.fromAccountPermission(ownerPermission);
        const activeAuthority = Authority.fromAccountPermission(activePermission);

        activeAuthority.addCodePermission(account);
        ownerAuthority.addCodePermission(account);

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

    const setSettings = {
        authorization: [
            {
                actor: 'staking.tmy',
                permission: 'active',
            },
        ],
        account: 'staking.tmy',
        name: 'setsettings',
        data: {
            // eslint-disable-next-line camelcase
            yearly_stake_pool: amountToAsset(StakingContract.yearlyStakePool, 'LEOS'),
        },
    };

    const setYearlyYield = {
        authorization: [
            {
                actor: 'infra.tmy',
                permission: 'active',
            },
        ],
        account: 'staking.tmy',
        name: 'addyield',
        data: {
            sender: 'infra.tmy',
            quantity: amountToAsset(StakingContract.yearlyStakePool / 2, 'LEOS'),
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...actions, setSettings, setYearlyYield],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
