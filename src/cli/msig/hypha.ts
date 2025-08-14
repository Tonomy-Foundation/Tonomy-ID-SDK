/* eslint-disable camelcase */
import {
    Authority,
    bytesToTokens,
    createAppJsonDataString,
    tokenContract,
    tonomyContract,
    tonomyEosioProxyContract,
} from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { deployContract } from './contract';
import { AccountType, getSettings, TonomyUsername } from '../../sdk';
import { Action, Name } from '@wharfkit/antelope';

// @ts-expect-error args not used
export async function hyphaAccountsCreate(args: any, options: StandardProposalOptions) {
    function createNewAccountAction(name: string, active: Authority, owner: Authority) {
        return tonomyEosioProxyContract.actions.newAccount({
            creator: 'tonomy',
            name,
            owner: owner,
            active: active,
        });
    }

    const tonomyGovActivePermission = {
        actor: 'gov.tmy',
        permission: 'active',
    };

    const daoHyphaAction = createNewAccountAction(
        'dao.hypha',
        Authority.fromKey('EOS7pMcjCS15XKxEssnFqKeq5HUJVTuoXMBbjYfGrQJrya2TSxgNV').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS7pMcjCS15XKxEssnFqKeq5HUJVTuoXMBbjYfGrQJrya2TSxgNV')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('dao.hypha')
    );
    const voiceHyphaAction = createNewAccountAction(
        'voice.hypha',
        Authority.fromKey('EOS55WiNqboivthg3uERZkdj4saxbSt8D33KQzWqaMBCXASoqxFsP')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('dao.hypha')
            .addCodePermission('voice.hypha'),
        Authority.fromKey('EOS55WiNqboivthg3uERZkdj4saxbSt8D33KQzWqaMBCXASoqxFsP').addAccount(tonomyGovActivePermission)
    );
    const hyphaHyphaAction = createNewAccountAction(
        'hypha.hypha',
        Authority.fromKey('EOS6KTU2YYtnN8ZRXDcG4cdFpRGkRssrBgR1u7Y3YqUX3KYYcfpRP')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('dao.hypha')
            .addCodePermission('hypha.hypha'),
        Authority.fromKey('EOS6KTU2YYtnN8ZRXDcG4cdFpRGkRssrBgR1u7Y3YqUX3KYYcfpRP').addAccount(tonomyGovActivePermission)
    );

    const husdHyphaAction = createNewAccountAction(
        'husd.hypha',
        Authority.fromKey('EOS8ftihCrL5nVJDUo4Y5qCzcJpeHuLA1jezP38j3jHm8tGDiAsbQ')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('dao.hypha')
            .addCodePermission('husd.hypha'),
        Authority.fromKey('EOS8ftihCrL5nVJDUo4Y5qCzcJpeHuLA1jezP38j3jHm8tGDiAsbQ').addAccount(tonomyGovActivePermission)
    );

    const kvHyphaAction = createNewAccountAction(
        'kv.hypha',
        Authority.fromKey('EOS8kcBzk6JrzDgoAqYMHzNFrgdkxJMM595kjJxWUPEfVtnHsdKLK').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS8kcBzk6JrzDgoAqYMHzNFrgdkxJMM595kjJxWUPEfVtnHsdKLK')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('kv.hypha')
    );
    const joinHyphaAction = createNewAccountAction(
        'join.hypha',
        Authority.fromKey('EOS52LPbWzd8iXUS3DWnn2CkU4HE4kVRSHVtyvWK4dDMLnAUYnogB').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS52LPbWzd8iXUS3DWnn2CkU4HE4kVRSHVtyvWK4dDMLnAUYnogB')
            .addAccount(tonomyGovActivePermission)
            .addCodePermission('join.hypha')
    );
    const srviceHyphaAction = createNewAccountAction(
        'srvice.hypha',
        Authority.fromKey('EOS7ammTdz8NCdpfPwwXqYck6d93iUVZaE4hgjgTyxXX1nYFEHMzJ').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS7ammTdz8NCdpfPwwXqYck6d93iUVZaE4hgjgTyxXX1nYFEHMzJ').addAccount(tonomyGovActivePermission)
    );
    const loginHyphaAction = createNewAccountAction(
        'login.hypha',
        Authority.fromKey('EOS7ktQxW7cPTF17VhTV6U64WVdGCtMoxM7kbszQmPYTsi5nMVfYi').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS7ktQxW7cPTF17VhTV6U64WVdGCtMoxM7kbszQmPYTsi5nMVfYi').addAccount(tonomyGovActivePermission)
    );

    const actions = [
        daoHyphaAction,
        voiceHyphaAction,
        hyphaHyphaAction,
        husdHyphaAction,
        kvHyphaAction,
        joinHyphaAction,
        srviceHyphaAction,
        loginHyphaAction,
    ];

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error args not used
export async function hyphaAddAccountPermissions(args: any, options: StandardProposalOptions) {
    const tonomyActivePermission = {
        actor: 'tonomy',
        permission: 'active',
    };
    const tonomyOwnerPermission = {
        actor: 'tonomy',
        permission: 'owner',
    };

    const hyphaDaoSchedulerPermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'dao.hypha',
                permission: 'active',
            },
            tonomyOwnerPermission,
            tonomyActivePermission,
        ],
        data: {
            account: 'dao.hypha',
            permission: 'scheduler',
            parent: 'active',
            auth: {
                threshold: 1,
                waits: [],
                accounts: [],
                keys: [
                    {
                        key: 'EOS8Et6mKgaNwQDBTSwPig9oDbgXKsjLyojbJg6rBNQ25M8YAoUiJ',
                        weight: 1,
                    },
                ],
            },
            auth_parent: true,
        },
    };
    const hyphaDaoLinkauthScheduler = {
        account: 'tonomy',
        name: 'linkauth',
        authorization: [
            {
                actor: 'dao.hypha',
                permission: 'active',
            },
        ],
        data: {
            account: 'dao.hypha',
            code: 'dao.hypha',
            type: 'removedtx',
            requirement: 'scheduler',
        },
    };
    const hyphaDaoAutoenrollPermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'dao.hypha',
                permission: 'active',
            },
            tonomyOwnerPermission,
            tonomyActivePermission,
        ],
        data: {
            account: 'dao.hypha',
            permission: 'autoenroll',
            parent: 'active',
            auth: {
                threshold: 1,
                waits: [],
                accounts: [
                    {
                        permission: {
                            actor: 'join.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                ],
                keys: [],
            },
            auth_parent: true,
        },
    };
    const hyphaDaoLinkauthAutoenroll = {
        account: 'tonomy',
        name: 'linkauth',
        authorization: [
            {
                actor: 'dao.hypha',
                permission: 'active',
            },
        ],
        data: {
            account: 'dao.hypha',
            code: 'dao.hypha',
            type: 'autoenroll',
            requirement: 'autoenroll',
        },
    };

    const actions = [
        hyphaDaoSchedulerPermission,
        hyphaDaoLinkauthScheduler,
        hyphaDaoAutoenrollPermission,
        hyphaDaoLinkauthAutoenroll,
    ].map((action) => Action.from(action));

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// @ts-expect-error args not used
export async function hyphaContractSet(args: any, options: StandardProposalOptions) {
    const ramKb = 60000;
    const name = 'dao';

    // const ramKb = 2000;
    // const name = 'husd';
    // const name = 'hypha';
    // const name = 'join';
    // const name = 'kv';
    // const name = 'login';
    // const name = 'voice';

    const contract = `${name}.hypha`;
    const appName = `Hypha ${name.toUpperCase()}`;
    const username = `${name}hypha`;
    const description = `Hypha ${name} contract`;
    const logoUrl = 'https://hypha.earth/wp-content/themes/hypha2023/img/logos/logo-white.svg';
    const origin = `https://${name}.pangea.hypha.earth`;
    const contractDir = `/home/dev/Downloads/pangea-hypha-deploy/${contract}`;

    const tonomyUsername = TonomyUsername.fromUsername(username, AccountType.APP, getSettings().accountSuffix);
    const tokens = bytesToTokens(ramKb * 1000);

    console.log(`Setting up hypha contract "${contract}" with ${tokens} tokens to buy ${ramKb}KB of RAM`);

    const adminSetAppAction = tonomyContract.actions.adminSetApp({
        jsonData: createAppJsonDataString(appName, description, logoUrl, '#000000', '#FFFFFF'),
        accountName: Name.from(contract),
        usernameHash: tonomyUsername.usernameHash,
        origin,
    });

    const transferTokensAction = tokenContract.actions.transfer({
        from: 'partners.tmy',
        to: contract,
        quantity: tokens,
        memo: `RAM for ${contract}`,
    });

    const buyRamAction = tonomyContract.actions.buyRam({
        daoOwner: contract,
        app: contract,
        quant: tokens,
    });

    const deployActions = await deployContract({
        contract: contract,
        directory: contractDir,
        returnActions: true,
        ...options,
    });

    if (!deployActions) throw new Error('Expected deployActions to be defined');

    const actions = [adminSetAppAction, transferTokensAction, buyRamAction, ...deployActions].map((action) =>
        Action.from(action)
    );

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [...options.requested, contract],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
