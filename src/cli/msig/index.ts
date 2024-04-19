import { PrivateKey, Name, Checksum256 } from '@wharfkit/antelope';
import { EosioMsigContract, setSettings } from '../../sdk';
import { ActionData, Authority, EosioTokenContract, createSigner } from '../../sdk/services/blockchain';
import settings from '../bootstrap/settings';

const eosioMsigContract = EosioMsigContract.Instance;

const governanceAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
let newGovernanceAccounts = [
    ...governanceAccounts,
    '4.found.tmy',
    '5.found.tmy',
    '11.found.tmy',
    '13.found.tmy',
    '14.found.tmy',
];

export default async function msig(args: string[]) {
    setSettings({
        blockchainUrl: settings.config.blockchainUrl,
        loggerLevel: settings.config.loggerLevel,
        currencySymbol: settings.config.currencySymbol,
    });

    console.log('Using environment', settings.env);

    let test = false;

    for (const arg of args) {
        if (arg.includes('--test')) {
            console.log('Testing proposal by executing it');

            if (settings.isProduction()) {
                throw new Error(`Cannot test proposal on a live environment. Environment: ${settings.env}`);
            }

            test = true;

            args.splice(args.indexOf(arg), 1);
            newGovernanceAccounts = governanceAccounts;
        }
    }

    const proposer = '1.found.tmy';
    const privateKey = PrivateKey.from(process.env.SIGNING_KEY || '');
    const signer = createSigner(privateKey);

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

            const proposalHash = await createProposal(proposer, proposalName, [action], privateKey, governanceAccounts);

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else if (proposalType === 'new-account') {
            const activeAuth = Authority.fromAccount({ actor: 'team.tmy', permission: 'active' });
            const additionalAuthority = test ? governanceAccounts[2] : '13.found.tmy';

            activeAuth.addAccount({ actor: additionalAuthority, permission: 'active' });
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

            const proposalHash = await createProposal(proposer, proposalName, [action], privateKey, governanceAccounts);

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else if (proposalType === 'transfer') {
            const from = 'team.tmy';

            const amountUsd = 100000;
            const price = 0.012;
            const amount = amountUsd / price;
            const quantity = amount.toFixed(0) + '.000000 LEOS';

            const balance = await EosioTokenContract.Instance.getBalance(from);

            if (balance < amount) {
                throw new Error(`Insufficient balance. Required: ${amount}, Available: ${balance}`);
            }

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
                    quantity,
                    memo: 'To pay advisors',
                },
            };

            const proposalHash = await createProposal(proposer, proposalName, [action], privateKey, governanceAccounts);

            if (test) await executeProposal(proposer, proposalName, proposalHash);
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

async function createProposal(
    proposer: string,
    proposalName: Name,
    actions: ActionData[],
    privateKey: PrivateKey,
    requested: string[]
): Promise<Checksum256> {
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
        const { transaction, proposalHash } = await eosioMsigContract.propose(
            proposer,
            proposalName,
            requestedPermissions,
            actions,
            createSigner(privateKey)
        );

        console.log('Transaction: ', JSON.stringify(transaction, null, 2));
        console.error('Transaction succeeded');

        console.log('Proposal name: ', proposalName.toString());
        console.log('You have 7 days to approve and execute the proposal.');
        return proposalHash;
    } catch (e) {
        if (e?.error?.details[0]?.message.includes('transaction declares authority')) {
            throw new Error(
                'The transaction authorization requirements are not correct. Check the action authorizations, and the "requested" permissions.'
            );
        } else {
            console.error('Error: ', JSON.stringify(e, null, 2));
            throw new Error('Transaction failed');
        }
    }
}

async function executeProposal(proposer: string, proposalName: Name, proposalHash: Checksum256) {
    if (!process.env.TONOMY_BOARD_PRIVATE_KEYS) throw new Error('TONOMY_BOARD_PRIVATE_KEYS not set');
    const tonomyGovKeys: string[] = JSON.parse(process.env.TONOMY_BOARD_PRIVATE_KEYS).keys;
    const tonomyGovSigners = tonomyGovKeys.map((key) => createSigner(PrivateKey.from(key)));

    try {
        for (let i = 0; i < 2; i++) {
            await eosioMsigContract.approve(
                proposer,
                proposalName,
                { actor: governanceAccounts[i], permission: 'active' },
                proposalHash,
                tonomyGovSigners[i]
            );
        }

        console.error('Proposal approved succeeded');

        await eosioMsigContract.exec(proposer, proposalName, governanceAccounts[0], tonomyGovSigners[0]);

        console.error('Proposal executed succeeded');
    } catch (e) {
        console.error('Error: ', JSON.stringify(e, null, 2));
        console.error('Transaction failed');
    }
}
