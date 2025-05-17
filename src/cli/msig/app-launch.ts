import { Name } from '@wharfkit/antelope';
// @ts-ignore unused variables (when createAccount/deployContract is commented out)
import { createProposal, StandardProposalOptions, executeProposal } from '.';
// @ts-ignore unused variables (when createAccount/deployContract is commented out)
import { AccountType, getSettings, TonomyUsername } from '../../sdk';
// @ts-ignore unused variables (when createAccount/deployContract is commented out)
import { ActionData, bytesToTokens, Authority } from '../../sdk/services/blockchain';
// @ts-ignore unused variables (when createAccount/deployContract is commented out)
import { deployContract } from './contract';

type AppType = {
    accountName: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    username: string;
    ownerKey: string;
    activeKey: string;
    ramKb: number;
    backgroundColor: string;
    accentColor: string;
};

const apps: AppType[] = [
    {
        accountName: 'invite.cxc',
        appName: 'cXc.world',
        description:
            'cXc.world is the tokenized Reddit, on a map. Subreddits become districts and nations where music competes to represent the area. One song can go to the top of the world of music, as charts grow and reset daily. Upvote once per 5 minutes. Buy Music NFTs from artists. Use BLUX to boost songs to #1.',
        logoUrl: 'https://ipfs.neftyblocks.io/ipfs/QmYzu7Dz7LqZP3jq4zmt84rpmjWm2AfhH1SF4Et5LbxVJy',
        origin: 'https://music.cxc.world',
        username: 'cxc',
        ownerKey: 'EOS5SdLniuD3aBn4pXpKchefT8kdFvkSBoGP91iMPhQEzwKBexobn',
        activeKey: 'EOS5hyK8XTDA3etSzaq6ntrafMPM37HEmveVv1YorkASpnk2jbMmt',
        ramKb: 5000,
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
    {
        accountName: 'bridge.cxc',
        appName: 'cXc.world bridge',
        description: 'Bridge app for cXc.world',
        logoUrl: 'https://ipfs.neftyblocks.io/ipfs/QmYzu7Dz7LqZP3jq4zmt84rpmjWm2AfhH1SF4Et5LbxVJy',
        origin: 'https://bridge.cxc.world',
        username: 'bridge.cxc',
        ownerKey: 'EOS5SdLniuD3aBn4pXpKchefT8kdFvkSBoGP91iMPhQEzwKBexobn',
        activeKey: 'EOS5hyK8XTDA3etSzaq6ntrafMPM37HEmveVv1YorkASpnk2jbMmt',
        ramKb: 5000,
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
    {
        accountName: 'tokens.cxc',
        appName: 'cXc.world tokens',
        description: 'Tokens app for cXc.world',
        logoUrl: 'https://ipfs.neftyblocks.io/ipfs/QmYzu7Dz7LqZP3jq4zmt84rpmjWm2AfhH1SF4Et5LbxVJy',
        origin: 'https://tokens.cxc.world',
        username: 'tokens.cxc',
        ownerKey: 'EOS5SdLniuD3aBn4pXpKchefT8kdFvkSBoGP91iMPhQEzwKBexobn',
        activeKey: 'EOS5hyK8XTDA3etSzaq6ntrafMPM37HEmveVv1YorkASpnk2jbMmt',
        ramKb: 1000, // 100 was too low
        backgroundColor: '#444444',
        accentColor: '#D19836',
    },
];

export async function launchApps(options: StandardProposalOptions) {
    await createAccounts(options);
    await deployContracts(options);
    await setupApps(options);
}

async function createAccounts(options: StandardProposalOptions) {
    const tonomyGovActivePermission = {
        actor: 'gov.tmy',
        permission: 'active',
    };

    const actions: ActionData[] = [];

    for (const app of apps) {
        const accountName = Name.from(app.accountName);

        console.log(
            `Creating account ${accountName.toString()} with keys owner: ${app.ownerKey} and active: ${app.activeKey} (and gov.tmy@active)`
        );

        actions.push({
            authorization: [
                {
                    actor: 'tonomy',
                    permission: 'active',
                },
            ],
            account: 'tonomy',
            name: 'newaccount',
            data: {
                creator: 'tonomy',
                name: accountName,
                owner: Authority.fromKey(app.ownerKey).addAccount(tonomyGovActivePermission),
                active: Authority.fromKey(app.activeKey).addAccount(tonomyGovActivePermission),
            },
        });
    }

    const proposalName = Name.from(options.proposalName.toString() + 'acc');

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

async function deployContracts(options: StandardProposalOptions) {
    for (const app of apps) {
        // NOTE: if authorization is not working please check the following:
        // - the authorization should contain {app.accountName@active} and tonomy@active
        // - requested should contain {app.accountName@active} and governance accounts (1.found.tmy, 2.fou...)
        await deployContract({
            ...options,
            contract: app.accountName,
            proposalName: Name.from(options.proposalName.toString() + app.accountName + 'contract'),
        });
    }
}

async function setupApps(options: StandardProposalOptions) {
    const actions: ActionData[] = [];

    for (const app of apps) {
        actions.push(adminSetAppAction(app));
        actions.push(transferTokensAction(app));
        actions.push(buyRamAction(app));
    }

    const proposalName = Name.from(options.proposalName.toString() + 'setup');
    const requested = [...options.requested, transferFrom]; // works for buyram (and should also work for adminsetapp and transfertokens)
    // const requested = [...options.requested]; // works for adminsetapp and transfertokens

    const proposalHash = await createProposal(
        options.proposer,
        proposalName,
        actions,
        options.privateKey,
        requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute) await executeProposal(options.proposer, proposalName, proposalHash);
}

function adminSetAppAction(app: AppType) {
    const tonomyUsername = TonomyUsername.fromUsername(app.username, AccountType.APP, getSettings().accountSuffix);

    console.log(`Calling tonomy::admninsetapp() for ${app.accountName} with username ${tonomyUsername.username}`);

    const json_data = JSON.stringify({
        app_name: app.appName,
        description: app.description,
        logo_url: app.logoUrl,
        background_color: app.backgroundColor,
        accent_color: app.accentColor,
    });

    return {
        authorization: [
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        account: 'tonomy',
        name: 'adminsetapp',
        data: {
            account_name: Name.from(app.accountName),
            json_data,
            username_hash: tonomyUsername.usernameHash,
            origin: app.origin,
        },
    };
}

function transferTokensAction(app: AppType) {
    const tokens = bytesToTokens(app.ramKb * 1000);

    console.log(`Transferring ${tokens} tokens to ${app.accountName} (for ${app.ramKb}KB of RAM)`);

    return {
        authorization: [
            {
                actor: transferFrom,
                permission: 'active',
            },
        ],
        account: 'eosio.token',
        name: 'transfer',
        data: {
            from: transferFrom,
            to: app.accountName,
            quantity: tokens,
            // memo: `RAM for ${app.accountName} (${app.ramKb}KB)`,
            memo: `deposit`, // needed for the bridge.cxc world app
        },
    };
}

const transferFrom = 'partners.tmy';

function buyRamAction(app: AppType) {
    const tokens = bytesToTokens(app.ramKb * 1000);

    console.log(`calling tonomy::buyram() for ${app.accountName} with ${tokens} tokens for ${app.ramKb}KB of RAM`);

    const authorization = [
        {
            actor: app.accountName,
            permission: 'active',
        },
    ];

    if (app.accountName !== transferFrom) {
        authorization.push({
            actor: transferFrom,
            permission: 'active',
        });
    }

    return {
        account: 'tonomy',
        name: 'buyram',
        authorization,
        data: {
            dao_owner: transferFrom,
            app: app.accountName,
            quant: tokens,
        },
    };
}
