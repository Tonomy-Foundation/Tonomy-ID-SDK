import {
    Authority,
    bytesToTokens,
    createAppJsonDataString,
    getApi,
    getTonomyContract,
    getTonomyEosioProxyContract,
    AppPlan,
} from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { deployContract } from './contract';
import { AccountType, getSettings, TonomyUsername } from '../../sdk';
import { Checksum256Type, Name, NameType } from '@wharfkit/antelope';

const logoUrl = 'https://ipfs.hivebp.io/ipfs/Qmexh5r5zJ7Us4Wm3tgedDSHss5t7DrDD8bDRLhz9eQi46';
const ownerKey = 'EOS5SdLniuD3aBn4pXpKchefT8kdFvkSBoGP91iMPhQEzwKBexobn';
const activeKey = 'EOS5hyK8XTDA3etSzaq6ntrafMPM37HEmveVv1YorkASpnk2jbMmt';
const contractDir = '/media/sf_Virtualbox_Shared/tonomy/cXc Contracts';

type AppData = {
    account: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    activeKey: string;
    ownerKey: string;
    ramKb: number;
    contractDir: string;
    username: string;
    backgroundColor: string;
    accentColor: string;
};

export const apps: AppData[] = [
    {
        account: 'bridge.cxc',
        appName: 'cXc Bridge',
        description: 'Bridge for cXc.world',
        logoUrl,
        origin: 'https://bridge.cxc.world',
        activeKey,
        ownerKey,
        ramKb: 5000, // 5MB
        contractDir,
        username: 'bridge.cxc',
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
    {
        account: 'invite.cxc',
        appName: 'cXc Music',
        description:
            'cXc.world is the tokenized Reddit, on a map. Subreddits become districts and nations where music competes to represent the area. One song can go to the top of the world of music, as charts grow and reset daily. Upvote once per 5 minutes. Buy Music NFTs from artists. Use BLUX to boost songs to #1.',
        logoUrl,
        origin: 'https://music.cxc.world',
        activeKey,
        ownerKey,
        ramKb: 5000, // 5MB
        contractDir,
        username: 'music.cxc',
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
    {
        account: 'tokens.cxc',
        appName: 'cXc Tokens',
        description: 'Tokens for cxc.world',
        logoUrl,
        origin: 'https://tokens.cxc.world',
        activeKey,
        ownerKey,
        ramKb: 1000, // 1MB
        contractDir,
        username: 'tokens.cxc',
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
];

//convert any number to a deterministic number using the digits 12345 (only digits allowed in Antelope account names)
function indexToNameDigits(index: number): string {
    return index.toString(5).replace('4', '5').replace('3', '4').replace('2', '3').replace('1', '2').replace('0', '1');
}

function createProposalName(proposalName: Name, suffix: string, index?: number): Name {
    const NAME_MAX_LENGTH = 13;

    if (suffix.length > 5) throw new Error(`Choose a shorter suffix, ${suffix} is too long`);
    const fullSuffix = suffix + (index ? indexToNameDigits(index) : '');
    const str = `${proposalName.toString().slice(0, NAME_MAX_LENGTH - fullSuffix.length)}${fullSuffix}`;

    return Name.from(str);
}

// MSIG 1: Create accounts for apps
export async function createAccounts(options: StandardProposalOptions) {
    function createNewAccountAction(name: string, active: Authority, owner: Authority) {
        return getTonomyEosioProxyContract().actions.newAccount({
            creator: 'tonomy',
            name,
            owner,
            active,
        });
    }

    const actions = apps.map((app) => {
        const active = Authority.fromKey(app.activeKey).addAccount({ actor: 'gov.tmy', permission: 'active' });
        const owner = Authority.fromKey(app.ownerKey).addAccount({ actor: 'gov.tmy', permission: 'active' });

        return createNewAccountAction(app.account, active, owner);
    });
    const proposalName = createProposalName(options.proposalName, 'crea');
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

// MSIG 2: Set accounts as apps, transfer TONO, buy RAM
export async function setAppsAndRam(options: StandardProposalOptions) {
    const actions = apps.flatMap((app) => {
        const tonomyUsername = TonomyUsername.fromUsername(app.username, AccountType.APP, getSettings().accountSuffix);
        const tokens = await bytesToTokens(app.ramKb * 1000);
        const adminUpdateAppAction = getTonomyContract().actions.adminUpdateApp({
            accountName: app.account,
            jsonData: createAppJsonDataString(
                app.appName,
                app.description,
                app.logoUrl,
                app.backgroundColor,
                app.accentColor
            ),
            username: tonomyUsername.toString(),
            origin: app.origin,
            plan: AppPlan.BASIC,
        });
        const buyRamAction = getTonomyContract().actions.scBuyRam({
            accountName: app.account,
            quant: tokens,
        });

        return [adminUpdateAppAction, buyRamAction];
    });
    const proposalName = createProposalName(options.proposalName, 'set');
    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        [...options.requested, ...apps.map((a) => a.account)],
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

// MSIG 3: Deploy contracts for apps
export async function deployContracts(options: StandardProposalOptions) {
    for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        const deployActions = await deployContract({
            contract: app.account,
            directory: app.contractDir,
            returnActions: true,
            ...options,
        });

        if (!deployActions) throw new Error(`Expected deployActions for ${app.account}`);

        // Generate a sequential proposal name, e.g. baseName-1, baseName-2, etc.
        const proposalName = createProposalName(options.proposalName, 'dep', i);
        const proposalHash = await createProposal(
            options.proposer,
            proposalName,
            deployActions,
            options.privateKey,
            [...options.requested, app.account],
            options.dryRun
        );

        if (options.dryRun) continue;
        if (options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
    }
}

// Create a new app
export async function newApp(options: StandardProposalOptions) {
    const appName = 'Fiddl.Art';
    const description = 'Create and Earn with AI Art';
    const logoUrl = 'https://fiddl.art/fiddlLogoWithText.png';
    const origin = 'https://fiddl.art';
    const usernameShort = 'fiddlart';
    const username = TonomyUsername.fromUsername(usernameShort, AccountType.APP, getSettings().accountSuffix);
    const key = 'EOS4xnrCGUT688wFvinQoCuiu7E3Qpn8Phq76TRKNTb87XFMjzsJu';

    const action = getTonomyContract().actions.appCreate({
        creator: options.proposer,
        jsonData: createAppJsonDataString(appName, description, logoUrl, '#444444', '#D19836'),
        username: username.toString(),
        origin,
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

        actions.push(
            getTonomyContract().actions.adminSetApp({
                accountName: row.account_name,
                jsonData: createAppJsonDataString(row.app_name, row.description, row.logo_url, background, branding),
                usernameHash: row.username_hash,
                origin: row.origin,
            })
        );
    }

    // Step 3: Optionally, clear the old table entries
    const eraseAppAction = getTonomyContract().actions.eraseOldApps();

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...actions, eraseAppAction],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function adminSetApps(options: StandardProposalOptions) {
    const appsToSet: {
        accountName: NameType;
        jsonData: string;
        usernameHash: Checksum256Type;
        origin: string;
    }[] = [
        {
            accountName: 'login.hypha',
            jsonData: createAppJsonDataString(
                'Hypha LOGIN',
                'Hypha login contract',
                'https://hypha.earth/wp-content/themes/hypha2023/img/logos/logo-white.svg',
                '#251950',
                '#BA54D3'
            ),
            usernameHash: '87c0b673703d9b4c8f7466898da956f256f242694de0a646544e5ccec2a2702b',
            origin: 'https://login.pangea-test.hypha.earth',
        },
        {
            accountName: 'staking.tmy',
            jsonData: createAppJsonDataString(
                'TONO Staking',
                'TONO Staking contract',
                'https://staking.accounts.testnet.tonomy.io/tonomy-logo1024.png',
                '#251950',
                '#BA54D3'
            ),
            usernameHash: 'cf2759aeeaa06d48d83f484cfdcc7a6291fb1edc1e099c09a4e7b7299a6fb66c',
            origin: 'https://staking.accounts.testnet.tonomy.io',
        },
        {
            accountName: 'tonomy',
            jsonData: createAppJsonDataString(
                'Tonomy System',
                'Tonomy system contract',
                'https://tonomy.accounts.testnet.tonomy.io/tonomy-logo1024.png',
                '#251950',
                '#BA54D3'
            ),
            usernameHash: 'e4df80a04452a582641a7a8ac274bd75558548b2c763e2bf31daade9b50b3726',
            origin: 'https://tonomy.accounts.testnet.tonomy.io',
        },
        {
            accountName: 'vesting.tmy',
            jsonData: createAppJsonDataString(
                'TONO Vesting',
                'TONO Vesting contract',
                'https://vesting.accounts.testnet.tonomy.io/tonomy-logo1024.png',
                '#251950',
                '#BA54D3'
            ),
            usernameHash: 'c6627d00b6f9b8e1fc57b27cb5234f0688b421ebff9901f882f922cf4c0df4ab',
            origin: 'https://vesting.accounts.testnet.tonomy.io',
        },
        {
            accountName: 'voice.hypha',
            jsonData: createAppJsonDataString(
                'Hypha VOICE',
                'Hypha voice contract',
                'https://hypha.earth/wp-content/themes/hypha2023/img/logos/logo-white.svg',
                '#251950',
                '#BA54D3'
            ),
            usernameHash: 'c642063d72beb6f074dfabc4c4e76e0fa9dd7cd6a8a1bfc257c4b3dcd8cd6d53',
            origin: 'https://voice.pangea-test.hypha.earth',
        },
    ];

    const actions = appsToSet.map((app) =>
        getTonomyContract().actions.adminSetApp({
            accountName: app.accountName,
            jsonData: app.jsonData,
            usernameHash: app.usernameHash,
            origin: app.origin,
        })
    );

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

export async function adminDeleteApps(options: StandardProposalOptions) {
    const appsToDelete: NameType[] = ['.onomy'];

    const actions = appsToDelete.map((accountName) =>
        getTonomyContract().actions.deleteApp({
            accountName,
        })
    );

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
