import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function hyphaAccountsCreate(args: any, options: StandardProposalOptions) {
    function createNewAccountAction(name: string, active: Authority, owner: Authority) {
        return {
            account: 'tonomy',
            name: 'newaccount',
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
                creator: 'tonomy',
                name,
                owner,
                active,
            },
        };
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
        Authority.fromKey('EOS7pMcjCS15XKxEssnFqKeq5HUJVTuoXMBbjYfGrQJrya2TSxgNV').addAccount(tonomyGovActivePermission)
    );
    const voiceHyphaOwner = Authority.fromKey('EOS55WiNqboivthg3uERZkdj4saxbSt8D33KQzWqaMBCXASoqxFsP').addAccount(
        tonomyGovActivePermission
    );
    const voiceHyphaActive = Authority.fromKey('EOS55WiNqboivthg3uERZkdj4saxbSt8D33KQzWqaMBCXASoqxFsP').addAccount(
        tonomyGovActivePermission
    );

    voiceHyphaActive.addCodePermission('dao.hypha');
    voiceHyphaActive.addCodePermission('voice.hypha');
    const voiceHyphaAction = createNewAccountAction('voice.hypha', voiceHyphaActive, voiceHyphaOwner);

    const hyphaHyphaOwner = Authority.fromKey('EOS6KTU2YYtnN8ZRXDcG4cdFpRGkRssrBgR1u7Y3YqUX3KYYcfpRP').addAccount(
        tonomyGovActivePermission
    );
    const hyphaHyphaActive = Authority.fromKey('EOS6KTU2YYtnN8ZRXDcG4cdFpRGkRssrBgR1u7Y3YqUX3KYYcfpRP').addAccount(
        tonomyGovActivePermission
    );

    hyphaHyphaActive.addCodePermission('dao.hypha');
    hyphaHyphaActive.addCodePermission('hypha.hypha');
    const hyphaHyphaAction = createNewAccountAction('hypha.hypha', hyphaHyphaActive, hyphaHyphaOwner);

    const husdHyphaOwner = Authority.fromKey('EOS8ftihCrL5nVJDUo4Y5qCzcJpeHuLA1jezP38j3jHm8tGDiAsbQ').addAccount(
        tonomyGovActivePermission
    );
    const husdHyphaActive = Authority.fromKey('EOS8ftihCrL5nVJDUo4Y5qCzcJpeHuLA1jezP38j3jHm8tGDiAsbQ').addAccount(
        tonomyGovActivePermission
    );

    husdHyphaActive.addCodePermission('dao.hypha');
    husdHyphaActive.addCodePermission('husd.hypha');
    const husdHyphaAction = createNewAccountAction('husd.hypha', husdHyphaActive, husdHyphaOwner);

    const kvHyphaAction = createNewAccountAction(
        'kv.hypha',
        Authority.fromKey('EOS8kcBzk6JrzDgoAqYMHzNFrgdkxJMM595kjJxWUPEfVtnHsdKLK').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS8kcBzk6JrzDgoAqYMHzNFrgdkxJMM595kjJxWUPEfVtnHsdKLK').addAccount(tonomyGovActivePermission)
    );
    const joinHyphaAction = createNewAccountAction(
        'join.hypha',
        Authority.fromKey('EOS52LPbWzd8iXUS3DWnn2CkU4HE4kVRSHVtyvWK4dDMLnAUYnogB').addAccount(
            tonomyGovActivePermission
        ),
        Authority.fromKey('EOS52LPbWzd8iXUS3DWnn2CkU4HE4kVRSHVtyvWK4dDMLnAUYnogB').addAccount(tonomyGovActivePermission)
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

    // const tonomyGovOwnerPermission = {
    //     actor: 'tonomy',
    //     permission: 'owner',
    // };
    // const hyphaDaoSchedulerPermission = {
    //     account: 'tonomy',
    //     name: 'updateauth',
    //     authorization: [
    //         {
    //             actor: 'dao.hypha',
    //             permission: 'active',
    //         },
    //         tonomyGovOwnerPermission,
    //         tonomyGovActivePermission,
    //     ],
    //     data: {
    //         account: 'dao.hypha',
    //         permission: 'scheduler',
    //         parent: 'active',
    //         auth: {
    //             threshold: 1,
    //             waits: [],
    //             accounts: [],
    //             keys: [
    //                 {
    //                     key: 'EOS6Cmu3MiVXvXAnz3NFZ7sBztGh38Em7FsifT8in7XwMXhNePgNE',
    //                     weight: 1,
    //                 },
    //             ],
    //         },
    //         auth_parent: true,
    //     },
    // };
    // const hyphaDaoLinkauthScheduler = {
    //     account: 'tonomy',
    //     name: 'linkauth',
    //     authorization: [
    //         {
    //             actor: 'dao.hypha',
    //             permission: 'active',
    //         },
    //     ],
    //     data: {
    //         account: 'dao.hypha',
    //         code: 'dao.hypha',
    //         type: 'removedtx',
    //         requirement: 'scheduler',
    //     },
    // };
    // const hyphaDaoAutoenrollPermission = {
    //     account: 'tonomy',
    //     name: 'updateauth',
    //     authorization: [
    //         {
    //             actor: 'dao.hypha',
    //             permission: 'active',
    //         },
    //         tonomyGovOwnerPermission,
    //         tonomyGovActivePermission,
    //     ],
    //     data: {
    //         account: 'dao.hypha',
    //         permission: 'autoenroll',
    //         parent: 'active',
    //         auth: {
    //             threshold: 1,
    //             waits: [],
    //             accounts: [
    //                 {
    //                     permission: {
    //                         actor: 'join.hypha',
    //                         permission: 'eosio.code',
    //                     },
    //                     weight: 1,
    //                 },
    //             ],
    //             keys: [],
    //         },
    //         auth_parent: true,
    //     },
    // };
    // const hyphaDaoLinkauthAutoenroll = {
    //     account: 'tonomy',
    //     name: 'linkauth',
    //     authorization: [
    //         {
    //             actor: 'dao.hypha',
    //             permission: 'active',
    //         },
    //     ],
    //     data: {
    //         account: 'dao.hypha',
    //         code: 'dao.hypha',
    //         type: 'autoenroll',
    //         requirement: 'autoenroll',
    //     },
    // };

    // const actions2 = [
    //     hyphaDaoSchedulerPermission,
    //     hyphaDaoLinkauthScheduler,
    //     hyphaDaoAutoenrollPermission,
    //     hyphaDaoLinkauthAutoenroll,
    // ];

    const proposalHash = await createProposal(options.proposer, options.proposalName, actions, options.privateKey, [
        ...options.requested,
    ]);

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
