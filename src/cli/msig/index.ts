import { PrivateKey, Name } from '@wharfkit/antelope';
import { EosioMsigContract, setSettings } from '../../sdk';
import { ActionData, Authority, createSigner } from '../../sdk/services/blockchain';
import settings from '../bootstrap/settings';

const eosioMsigContract = EosioMsigContract.Instance;

export default async function msig(args: string[]) {
    setSettings({
        blockchainUrl: settings.config.blockchainUrl,
        loggerLevel: settings.config.loggerLevel,
    });

    console.log('Using environment', settings.env);

    const proposer = '1.found.tmy';
    const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
    const signer = createSigner(privateKey);
    const governanceAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
    const newGovernanceAccounts = [
        ...governanceAccounts,
        '4.found.tmy',
        '5.found.tmy',
        '11.found.tmy',
        '13.found.tmy',
        '14.found.tmy',
    ];

    if (args[0] === 'cancel') {
        const proposalName = Name.from(args[1]);

        try {
            const transaction = await eosioMsigContract.cancel(proposer, proposalName, proposer, signer);

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            console.error('Transaction failed');
        }
    } else if (args[0] === 'propose') {
        const proposalType = args[1];
        const proposalName = Name.from(args[2]);

        // eslint-disable-next-line no-inner-declarations
        async function createProposal(actions: ActionData[], requested = newGovernanceAccounts) {
            const requestedPermissions = requested.map((actor) => ({
                actor,
                permission: 'active',
            }));

            console.log(
                'Sending transaction',
                JSON.stringify(
                    {
                        proposer,
                        proposalName,
                        requestedPermissions,
                        actions,
                        signer: privateKey.toPublic(),
                    },
                    null,
                    2
                )
            );

            try {
                const { transaction } = await eosioMsigContract.propose(
                    proposer,
                    proposalName,
                    requestedPermissions,
                    actions,
                    signer
                );

                console.log('Transaction: ', JSON.stringify(transaction, null, 2));
                console.error('Transaction succeeded');

                console.log('Proposal name: ', proposalName.toString());
                console.log('You have 7 days to approve and execute the proposal.');
            } catch (e) {
                if (e?.error?.details[0]?.message.includes('transaction declares authority')) {
                    console.error(
                        'The transaction authorization requirements are not correct. Check the action authorizations, and the "requested" permissions.'
                    );
                } else {
                    console.error('Error: ', JSON.stringify(e, null, 2));
                    console.error('Transaction failed');
                }
            }
        }

        if (proposalType === 'gov-migrate') {
            const action = {
                account: 'tonomy',
                name: 'updateauth',
                authorization: [
                    {
                        actor: 'tonomy',
                        permission: 'active',
                    },
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                ],
                data: {
                    account: 'found.tmy',
                    permission: 'owner',
                    parent: '',
                    auth: Authority.fromAccountArray(newGovernanceAccounts, 'active', 2),
                    // eslint-disable-next-line camelcase
                    auth_parent: false, // should be true when a new permission is being created, otherwise false
                },
            };

            await createProposal([action], governanceAccounts);
        } else if (proposalType === 'new-account') {
            const activeAuth = Authority.fromAccount({ actor: 'team.tmy', permission: 'active' });

            activeAuth.addAccount({ actor: '13.found.tmy', permission: 'active' });
            const action = {
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
                    name: 'advteam.tmy',
                    owner: Authority.fromAccount({ actor: 'team.tmy', permission: 'owner' }),
                    active: activeAuth,
                },
            };

            await createProposal([action]);
        } else if (proposalType === 'transfer') {
            const from = 'team.tmy';
            const action = {
                account: 'eosio.token',
                name: 'transfer',
                authorization: [
                    {
                        actor: from,
                        permission: 'active',
                    },
                ],
                data: {
                    from: from,
                    to: 'advteam.tmy',
                    quantity: '10000000.000000 LEOS',
                    memo: 'To pay advisors',
                },
            };

            await createProposal([action]);
        } else {
            throw new Error(`Invalid msig proposal type ${proposalType}`);
        }
    } else if (args[0] === 'exec') {
        const proposalName = Name.from(args[1]);

        try {
            const transaction = await eosioMsigContract.exec(proposer, proposalName, proposer, signer);

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            console.error('Transaction failed');
        }
    } else {
        throw new Error(`Invalid msig command ${args[0]}`);
    }
}
