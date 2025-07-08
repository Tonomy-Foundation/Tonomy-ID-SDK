/* eslint-disable camelcase */
import { ActionData, Authority, bytesToTokens } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { deployContract } from './contract';
import { AccountType, getSettings, TonomyUsername } from '../../sdk';
import { Name } from '@wharfkit/antelope';

const logoUrl = 'https://ipfs.hivebp.io/ipfs/Qmexh5r5zJ7Us4Wm3tgedDSHss5t7DrDD8bDRLhz9eQi46';
const ownerKey = 'EOS5SdLniuD3aBn4pXpKchefT8kdFvkSBoGP91iMPhQEzwKBexobn';
const activeKey = 'EOS5hyK8XTDA3etSzaq6ntrafMPM37HEmveVv1YorkASpnk2jbMmt';
const contractDir = '/media/sf_Virtualbox_Shared/tonomy/cXc Contracts';

export const apps = [
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
        usernameShort: 'bridge.cxc',
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
        usernameShort: 'music.cxc',
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
        usernameShort: 'tokens.cxc',
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
        return {
            account: 'tonomy',
            name: 'newaccount',
            authorization: [
                { actor: 'tonomy', permission: 'owner' },
                { actor: 'tonomy', permission: 'active' },
            ],
            data: {
                creator: 'tonomy',
                name,
                owner,
                active,
            },
        };
    }

    const actions: ActionData[] = apps.map((app) =>
        createNewAccountAction(app.account, Authority.fromKey(app.activeKey), Authority.fromKey(app.ownerKey))
    );
    const proposalName = createProposalName(options.proposalName, 'crea');
    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

// MSIG 2: Set accounts as apps, transfer TONO, buy RAM
export async function setAppsAndRam(options: StandardProposalOptions) {
    const actions: ActionData[] = apps.flatMap((app) => {
        const tonomyUsername = TonomyUsername.fromUsername(
            app.usernameShort,
            AccountType.APP,
            getSettings().accountSuffix
        );
        const tokens = bytesToTokens(app.ramKb * 1000);
        const adminSetAppAction = {
            authorization: [{ actor: 'tonomy', permission: 'active' }],
            account: 'tonomy',
            name: 'adminsetapp',
            data: {
                account_name: Name.from(app.account),
                app_name: app.appName,
                description: app.description,
                username_hash: tonomyUsername.usernameHash,
                logo_url: app.logoUrl,
                origin: app.origin,
            },
        };
        const transferTokensAction = {
            authorization: [{ actor: 'partners.tmy', permission: 'active' }],
            account: 'eosio.token',
            name: 'transfer',
            data: {
                from: 'partners.tmy',
                to: app.account,
                quantity: tokens,
                memo: `RAM for ${app.account}`,
            },
        };
        const buyRamAction = {
            account: 'tonomy',
            name: 'buyram',
            authorization: [{ actor: app.account, permission: 'active' }],
            data: {
                dao_owner: app.account,
                app: app.account,
                quant: tokens,
            },
        };

        return [adminSetAppAction, transferTokensAction, buyRamAction];
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

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
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

    const action = {
        account: 'tonomy',
        name: 'newapp',
        authorization: [
            {
                actor: 'tonomy',
                permission: 'owner',
            },
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        data: {
            app_name: appName,
            description,

            logo_url: logoUrl,
            origin: origin,

            username_hash: username.usernameHash,
            key,
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
