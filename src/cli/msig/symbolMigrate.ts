import { Name } from '@wharfkit/antelope';
import { createProposal, executeProposal, StandardProposalOptions } from '.';
import { TonomyContract } from '../../sdk';
import {
    foundAccount,
    foundControlledAccounts,
    operationsAccount,
    opsControlledAccounts,
    systemAccount,
} from '../bootstrap';
import settings from '../settings';
import { getAllUniqueHolders } from '../vesting';

export async function symbolMigrate(options: StandardProposalOptions) {
    await migrateEosioToken(options);
    console.log('');
    await migrateVesting(options);
    console.log('');
    await migrateStaking(options);
    console.log('');
    await migrateRebrand(options);
    console.log('');
    console.log('Migration complete');
}

async function migrateEosioToken(options: StandardProposalOptions) {
    console.log('Migrating eosio.token');
    const bootstrappedAccounts = new Set<string>();

    bootstrappedAccounts.add(foundAccount);
    bootstrappedAccounts.add(operationsAccount);
    bootstrappedAccounts.add(systemAccount);
    if (settings.env === 'production') bootstrappedAccounts.add('advteam.tmy');
    for (const account of foundControlledAccounts) bootstrappedAccounts.add(account);
    for (const account of opsControlledAccounts) bootstrappedAccounts.add(account);

    const actions: any = Array.from(bootstrappedAccounts).map((account) => {
        console.log(`eosio.token::migrateacc(${account})`);
        return {
            account: 'eosio.token',
            name: 'migrateacc',
            authorization: [
                {
                    actor: 'eosio.token',
                    permission: 'active',
                },
            ],
            data: {
                account,
            },
        };
    });

    console.log(`Total accounts to migrate: ${actions.length}`);
    console.log(`eosio.token::migratestats()`);
    actions.push({
        account: 'eosio.token',
        name: 'migratestats',
        authorization: [
            {
                actor: 'eosio.token',
                permission: 'active',
            },
        ],
        data: {},
    });

    const proposalHash = await createProposal(
        options.proposer,
        Name.from(options.proposalName.toString() + '1'),
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

async function migrateVesting(options: StandardProposalOptions) {
    console.log('Migrating vesting.tmy');
    console.log('Fetching vested tokens');
    const vestingHolders = await getAllUniqueHolders();

    const actions = Array.from(vestingHolders).map((holder) => {
        console.log(`vesting.tmy::migrateacc(${holder})`);
        return {
            account: 'vesting.tmy',
            name: 'migrateacc',
            authorization: [
                {
                    actor: 'vesting.tmy',
                    permission: 'active',
                },
            ],
            data: {
                account: holder,
            },
        };
    });

    console.log(`Total accounts to migrate: ${actions.length}`);

    const proposalHash = await createProposal(
        options.proposer,
        Name.from(options.proposalName.toString() + '2'),
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

async function migrateStaking(options: StandardProposalOptions) {
    const action = {
        account: 'staking.tmy',
        name: 'resetall',
        authorization: [
            {
                actor: 'staking.tmy',
                permission: 'active',
            },
        ],
        data: {},
    };
    const proposalHash = await createProposal(
        options.proposer,
        Name.from(options.proposalName.toString() + '3'),
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function migrateRebrand(options: StandardProposalOptions) {
    const apps = await TonomyContract.Instance.getApps();
    const actions = await apps
        .filter((app) => app.origin.includes('pangea.web4.world'))
        .map((app) => {
            return {
                account: 'tonomy',
                name: 'adminsetapp',
                authorization: [
                    {
                        actor: 'tonomy',
                        permission: 'active',
                    },
                ],
                data: {
                    account_name: app.account_name,
                    app_name: app.app_name.replace('Pangea', 'Tonomy'),
                    description: app.description.replace('Pangea', 'Tonomy'),
                    username_hash: app.username_hash,
                    logo_url: app.logo_url.replace('pangea.web4.world', 'tonomy.io'),
                    origin: app.origin.replace('pangea.web4.world', 'tonomy.io'),
                },
            };
        });

    const proposalHash = await createProposal(
        options.proposer,
        Name.from(options.proposalName.toString() + '4'),
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
