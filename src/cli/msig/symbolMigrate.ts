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
import { getAllAllocations, getAllUniqueHolders } from '../vesting';
import { deployContract } from './contract';
import { ActionData, assetToDecimal } from '../../sdk/services/blockchain';
import { toBase6Plus1 } from './vestingMigrateAllocate';

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
        .filter((app) => {
            const name = app.app_name.toLowerCase();
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
            let newAppName = app.app_name.replace('Pangea', 'Tonomy').replace('LEOS', 'TONO');
            let newDescription = app.description.replace('Pangea', 'Tonomy').replace('LEOS', 'TONO');
            let newOrigin = app.origin.replace('pangea.web4.world', 'tonomy.io');
            let newLogoUrl = app.logo_url.replace('pangea.web4.world', 'tonomy.io');

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
                    app_name: newAppName,
                    description: newDescription,
                    username_hash: app.username_hash,
                    logo_url: newLogoUrl,
                    origin: newOrigin,
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

    if (!options.dryRun && options.autoExecute) {
        await executeProposal(options.proposer, proposalName, proposalHash);
    }
}

function createMigrateAction(holder: string) {
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
}

export async function migrateVesting2(options: StandardProposalOptions) {
    let count = 0;
    let proposals = 0;
    const batchSize = 100;
    const uniqueHolders = await getAllUniqueHolders();
    const allAllocations = await getAllAllocations(uniqueHolders);

    for (let i = 0; i < allAllocations.length; i += batchSize) {
        const batch = allAllocations.slice(i, i + batchSize);

        const actions: ActionData[] = batch.map((allocation) => {
            console.log(
                `Migrating account ${allocation.holder} allocation ${allocation.id} in category ${allocation.vesting_category_type}  ${allocation.tokens_allocated} `
            );
            count++;

            return createMigrateAction(allocation.holder);
        });

        const proposalName = Name.from(`${options.proposalName}${toBase6Plus1(Math.floor(i / batchSize))}`);

        console.log(
            `Creating proposal ${proposalName.toString()} with ${actions.length} actions: ${i} - ${i + batchSize}`
        );
        console.log('----------------------------------------');
        proposals++;
        const proposalHash = await createProposal(
            options.proposer,
            proposalName,
            actions,
            options.privateKey,
            options.requested,
            options.dryRun
        );

        if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);

        console.log('----------------------------------------');
    }

    console.log(`Batch size: ${batchSize}`);
    console.log(`Proposals created: ${proposals}`);
    console.log(`Processed ${count} / ${allAllocations.length} allocations`);
}
