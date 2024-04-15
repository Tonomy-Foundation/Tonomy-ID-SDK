import { PrivateKey, Name } from '@wharfkit/antelope';
import { EosioMsigContract, setSettings } from '../../sdk';
import { createSigner } from '../../sdk/services/blockchain';
import { createAuthorityFromAccountArray } from '../authority';
import settings from '../bootstrap/settings';

const eosioMsigContract = EosioMsigContract.Instance;

export default async function msig(args: string[]) {
    setSettings({
        blockchainUrl: settings.config.blockchainUrl,
        loggerLevel: settings.config.loggerLevel,
    });

    console.log('Using environment', settings.env);

    const proposalName = Name.from(args[1]);
    const proposer = '1.found.tmy';

    const permission = 'active';
    let requested, actions;

    if (args[0] === 'gov-update') {
        requested = [
            {
                actor: '1.found.tmy',
                permission,
            },
            {
                actor: '2.found.tmy',
                permission,
            },
            {
                actor: '3.found.tmy',
                permission,
            },
        ];

        const updateAuthAction = {
            account: 'tonomy',
            name: 'updateauth',
            authorization: [
                {
                    actor: 'tonomy',
                    permission: 'active',
                },
            ],
            data: {
                account: 'tonomy',
                permission: 'active',
                parent: 'owner',
                auth: createAuthorityFromAccountArray(
                    [
                        '1.found.tmy',
                        '2.found.tmy',
                        '3.found.tmy',
                        '4.found.tmy',
                        '5.found.tmy',
                        '11.found.tmy',
                        '13.found.tmy',
                        '14.found.tmy',
                    ],
                    permission
                ),
                auth_parent: true, // should be false when permission is 'owner'
            },
        };

        actions = [updateAuthAction];
    } else {
        throw new Error(`Invalid msig command ${args[0]}`);
    }

    const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
    const signer = createSigner(privateKey);

    console.log(
        'Sending transaction',
        JSON.stringify(
            {
                proposer,
                proposalName,
                requested,
                actions: actions,
                signer: privateKey.toPublic(),
            },
            null,
            2
        )
    );

    try {
        const { transaction } = await eosioMsigContract.propose(proposer, proposalName, requested, actions, signer);

        console.log('Transaction: ', JSON.stringify(transaction, null, 2));
    } catch (e) {
        if (e.error.details[0].message.includes('transaction declares authority')) {
            console.error(
                'The transaction authorization requirements are not correct. Check the action authorizations, and the "requested" permissions.'
            );
        } else {
            console.error('Error: ', JSON.stringify(e, null, 2));
        }
    }
}
