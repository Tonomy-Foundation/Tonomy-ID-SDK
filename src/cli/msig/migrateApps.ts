/* eslint-disable camelcase */
import { getApi } from '../../sdk/services/blockchain/eosio/eosio';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { tonomyContract } from '../../sdk';

const CONTRACT_NAME = 'tonomy';

function getDefaultColors(): { background: string; branding: string } {
    return {
        background: '#251950', // white background
        branding: '#BA54D3', // grey color
    };
}

// Define a mapping for apps with custom colors
const customColorMapping: { [appName: string]: { background: string; branding: string } } = {
    'Tonomy - Development Demo': { background: '#251950', branding: '#BA54D3' },
    // Add other app mappings here
};

export async function migrateApps(options: StandardProposalOptions) {
    const api = await getApi();

    // Step 1: Query the old table apps
    const data = await api.v1.chain.get_table_rows({
        json: true,
        code: CONTRACT_NAME,
        scope: CONTRACT_NAME,
        table: 'apps',
    });

    console.log('All existing apps', data.rows);

    // Step 2: For each row, call adminSetApp with default colors
    const actions = [];

    for (const row of data.rows) {
        // Retrieve default color values.
        const colors = customColorMapping[row.app_name] || getDefaultColors();
        const { background, branding } = colors;

        console.log(`Migrating app: ${row.app_name}`);

        const json_data = JSON.stringify({
            app_name: row.app_name,
            description: row.description,
            logo_url: row.logo_url,
            background_color: background,
            accent_color: branding,
        });

        actions.push(
            tonomyContract.actions.adminSetApp({
                accountName: row.account_name,
                jsonData: json_data,
                usernameHash: row.username_hash,
                origin: row.origin,
            })
        );
    }

    // Step 3: Optionally, clear the old table entries
    const eraseAppAction = tonomyContract.actions.eraseOldApps();

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...actions, eraseAppAction],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
