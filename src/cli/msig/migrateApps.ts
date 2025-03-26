/* eslint-disable camelcase */
import { getApi } from '../../sdk/services/blockchain/eosio/eosio';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

const CONTRACT_NAME = 'tonomy';

function getDefaultColors(): { background: string; text: string; branding: string } {
    return {
        background: '#ffffff', // white background
        text: '#000000', // black text
        branding: '#CBCBCB', // grey color
    };
}

// Define a mapping for apps with custom colors
const customColorMapping: { [appName: string]: { background: string; text: string; branding: string } } = {
    'Tonomy - Development Demo': { background: '#000000', text: '#FFFFFF', branding: '#CBCBCB' },
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
        const { background, text, branding } = colors;

        console.log(`Migrating app: ${row.app_name}`);

        const json_data = JSON.stringify({
            app_name: row.app_name,
            description: row.description,
            logo_url: row.logo_url,
            background_color: background,
            text_color: text,
            branding_color: branding,
        });

        actions.push({
            authorization: [
                {
                    actor: CONTRACT_NAME,
                    permission: 'active',
                },
            ],
            account: CONTRACT_NAME,
            name: 'adminsetapp',
            data: {
                account_name: row.account_name,
                json_data,
                username_hash: row.username_hash,
                origin: row.origin,
            },
        });
    }

    // Step 3: Optionally, clear the old table entries
    const eraseAppAction = {
        account: CONTRACT_NAME,
        name: 'eraseoldapps',
        authorization: [
            {
                actor: CONTRACT_NAME,
                permission: 'owner',
            },
        ],
        data: {},
    };

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
