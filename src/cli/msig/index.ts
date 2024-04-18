import { PrivateKey, Name } from '@wharfkit/antelope';
import { EosioMsigContract, setSettings } from '../../sdk';
import { Authority, createSigner } from '../../sdk/services/blockchain';
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
        const proposalName = Name.from(args[2]);

        if (args[1] === 'gov-update') {
            const requested = governanceAccounts.map((actor) => ({
                actor,
                permission: 'active',
            }));

            const updateAuthAction = {
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

            const actions = [updateAuthAction];

            console.log(
                'Sending transaction',
                JSON.stringify(
                    {
                        proposer,
                        proposalName,
                        requested,
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
                    requested,
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
        } else {
            throw new Error(`Invalid msig proposal ${args[1]}`);
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
