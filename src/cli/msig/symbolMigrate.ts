import { createProposal, executeProposal, StandardProposalOptions } from '.';
import {
    foundAccount,
    foundControlledAccounts,
    operationsAccount,
    opsControlledAccounts,
    systemAccount,
} from '../bootstrap';
import settings from '../settings';

export async function symbolMigrate(options: StandardProposalOptions) {
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
        options.proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
