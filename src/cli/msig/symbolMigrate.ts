/* eslint-disable camelcase */
import { Name } from '@wharfkit/antelope';
import { createProposal, executeProposal, StandardProposalOptions } from '.';
import { TonomyContract } from '../../sdk';
import { getSettings } from '../../sdk';
import {
    foundAccount,
    foundControlledAccounts,
    operationsAccount,
    opsControlledAccounts,
    systemAccount,
} from '../bootstrap';
import settings from '../settings';
import { getAllUniqueHolders } from '../vesting';
import { deployContract } from './contract';

export async function symbolMigrate(options: StandardProposalOptions) {
    await redoployContracts(options);
    console.log('');
    await migrateStaking(options);
    console.log('');
    await migrateEosioToken(options);
    console.log('');
    await migrateVesting(options);
    console.log('');
    await migrateRebrandApps(options);
    console.log('');
    console.log('Migration complete');
}

// // @ts-expect-error options not used
async function redoployContracts(options: StandardProposalOptions) {
    console.log('### Redploying contracts');
    await deployContract({
        ...options,
        proposalName: Name.from(options.proposalName.toString() + '1a'),
        contract: 'eosio.token',
    });
    await deployContract({
        ...options,
        proposalName: Name.from(options.proposalName.toString() + '1b'),
        contract: 'tonomy',
    });
    await deployContract({
        ...options,
        proposalName: Name.from(options.proposalName.toString() + '1c'),
        contract: 'vesting.tmy',
    });
    await deployContract({
        ...options,
        proposalName: Name.from(options.proposalName.toString() + '1d'),
        contract: 'staking.tmy',
    });
}

async function migrateEosioToken(options: StandardProposalOptions) {
    console.log('### Migrating eosio.token');
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

    const proposalName = Name.from(options.proposalName.toString() + '2');
    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

async function migrateVesting(options: StandardProposalOptions) {
    console.log('### Migrating vesting.tmy');
    console.log('Fetching vested tokens');
    const vestingHolders =
        getSettings().environment === 'development'
            ? new Set<string>(['team.tmy', 'found.tmy'])
            : await getAllUniqueHolders();

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

    const proposalName = Name.from(options.proposalName.toString() + '3');
    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

async function migrateStaking(options: StandardProposalOptions) {
    console.log('### Migrating staking.tmy');
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
    const proposalName = Name.from(options.proposalName.toString() + '4');

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

export async function migrateRebrandApps(options: StandardProposalOptions) {
    console.log('### Migrating rebranding');

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

    const proposalName = Name.from(options.proposalName.toString() + '5');

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}
