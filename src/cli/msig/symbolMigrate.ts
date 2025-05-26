/* eslint-disable camelcase */
import { Name } from '@wharfkit/antelope';
import { createProposal, executeProposal, StandardProposalOptions } from '.';
import { stakingContract, tonomyContract, TonomyContract, vestingContract } from '../../sdk';
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
        return vestingContract.actions.migrateacc({
            holder,
        });
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
    const action = stakingContract.actions.resetAll({});
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

    const apps = await tonomyContract.getApps();
    const actions = await apps
        .filter((app) => {
            const name = app.appName.toLowerCase();
            const description = app.description.toLowerCase();
            const origin = app.origin.toLowerCase();

            return (
                name.includes('pangea') ||
                name.includes('leos') ||
                (name.includes('sales') &&
                    description.includes(`sales${settings.env === 'production' ? '' : ' testnet'} platform`)) ||
                description.includes('pangea') ||
                description.includes('leos') ||
                origin.includes('pangea.web4.world')
            );
        })
        .map((app) => {
            let newAppName = app.appName.replace('Pangea', 'Tonomy').replace('LEOS', 'TONO');
            let newDescription = app.description.replace('Pangea', 'Tonomy').replace('LEOS', 'TONO');
            let newOrigin = app.origin.replace('pangea.web4.world', 'tonomy.io');
            let newLogoUrl = app.logoUrl.replace('pangea.web4.world', 'tonomy.io');

            if (
                newAppName.toLowerCase().includes('sales') &&
                newDescription
                    .toLowerCase()
                    .includes(`sales${settings.env === 'production' ? '' : ' testnet'} platform`)
            ) {
                newAppName = `Tonomy${settings.env === 'production' ? '' : ' Testnet'} Launchpad`;
                newDescription = `Tonomy${settings.env === 'production' ? '' : ' Testnet'} Launchpad`;
                newOrigin = `https://launchpad${settings.env === 'production' ? '' : '.testnet'}.tonomy.io`;
            }

            if (newLogoUrl.includes('LEOS%20256x256.png')) {
                newLogoUrl =
                    'https://cdn.prod.website-files.com/67ea90b224287f4cbb2dd180/67ef991d349ec01179aec16d_icon1.png';
            }

            return tonomyContract.actions.adminSetApp({
                accountName: app.accountName,
                usernameHash: app.usernameHash,
                origin: newOrigin,
                jsonData: JSON.stringify({
                    app_name: newAppName,
                    description: newDescription,
                    logo_url: newLogoUrl,
                    background_color: '#000000',
                    accent_color: '#FFFFFF',
                }),
            });
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

    if (!options.dryRun && options.autoExecute) {
        await executeProposal(options.proposer, proposalName, proposalHash);
    }
}
