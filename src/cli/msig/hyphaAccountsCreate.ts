import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function hyphaAccountsCreate(args: any, options: StandardProposalOptions) {
    /*
    updateauth dao.hypha::scheduler > EOS6Cmu3MiVXvXAnz3NFZ7sBztGh38Em7FsifT8in7XwMXhNePgNE
    linkauth dao.hypha::scheduler > dao.hypha@removedtx
    updateauth dao.hypha::autoenroll > join.hypha@eosio.code
    linkauth dao.hypha::autoenroll > dao.hypha@autenroll
    updateauth voice.hypha::active > dao.hypha@active voice.hypha@active gov.tmy@active EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB
    updateauth hypha.hypha::active > dao.hypha@eosio.code gov.tmy@active hypha.hypha@eosio.code EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB
    updateauth husd.hypha::active > dao.hypha@eosio.code husd.hypha@eosio.code gov.tmy@active EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB
    */
    const tonomyGovOwnerPermission = {
        actor: 'tonomy',
        permission: 'owner',
    };
    const tonomyGovActivePermission = {
        actor: 'tonomy',
        permission: 'active',
    };
    const hyphaDaoSchedulerPermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'dao.hypha',
                permission: 'active',
            },
            tonomyGovOwnerPermission,
            tonomyGovActivePermission,
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
                        key: 'EOS6Cmu3MiVXvXAnz3NFZ7sBztGh38Em7FsifT8in7XwMXhNePgNE',
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
            tonomyGovOwnerPermission,
            tonomyGovActivePermission,
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
    const voiceHyphaUpdateAuthActive = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'voice.hypha',
                permission: 'active',
            },
            tonomyGovActivePermission,
            tonomyGovActivePermission,
        ],
        data: {
            account: 'voice.hypha',
            permission: 'active',
            parent: 'owner',
            auth: {
                threshold: 1,
                waits: [],
                accounts: [
                    {
                        permission: {
                            actor: 'dao.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'gov.tmy',
                            permission: 'active',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'voice.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                ],
                keys: [
                    {
                        key: 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB',
                        weight: 1,
                    },
                ],
            },
            auth_parent: false,
        },
    };
    const hyphaHyphaUpdateAuthActive = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'hypha.hypha',
                permission: 'active',
            },
            tonomyGovOwnerPermission,
            tonomyGovActivePermission,
        ],
        data: {
            account: 'hypha.hypha',
            permission: 'active',
            parent: 'owner',
            auth: {
                threshold: 1,
                waits: [],
                accounts: [
                    {
                        permission: {
                            actor: 'dao.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'gov.tmy',
                            permission: 'active',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'hypha.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                ],
                keys: [
                    {
                        key: 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB',
                        weight: 1,
                    },
                ],
            },
            auth_parent: false,
        },
    };
    const husdHyphaUpdateAuthActive = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'husd.hypha',
                permission: 'active',
            },
            tonomyGovActivePermission,
            tonomyGovActivePermission,
        ],
        data: {
            account: 'husd.hypha',
            permission: 'active',
            parent: 'owner',
            auth: {
                threshold: 1,
                waits: [],
                accounts: [
                    {
                        permission: {
                            actor: 'dao.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'gov.tmy',
                            permission: 'active',
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: 'husd.hypha',
                            permission: 'eosio.code',
                        },
                        weight: 1,
                    },
                ],
                keys: [
                    {
                        key: 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB',
                        weight: 1,
                    },
                ],
            },
            auth_parent: false,
        },
    };

    const actions = [
        hyphaDaoSchedulerPermission,
        hyphaDaoLinkauthScheduler,
        hyphaDaoAutoenrollPermission,
        hyphaDaoLinkauthAutoenroll,
        voiceHyphaUpdateAuthActive,
        hyphaHyphaUpdateAuthActive,
        husdHyphaUpdateAuthActive,
    ];

    const proposalHash = await createProposal(options.proposer, options.proposalName, actions, options.privateKey, [
        ...options.requested,
    ]);

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
