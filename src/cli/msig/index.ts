import { PrivateKey, Name, Checksum256, PublicKey, Weight } from '@wharfkit/antelope';
import { EosioMsigContract, SdkError, SdkErrors, setSettings } from '../../sdk';
import { ActionData, createSigner, getAccount, getProducers } from '../../sdk/services/blockchain';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import settings from '../bootstrap/settings';
import { govMigrate } from './govMigrate';
import { newAccount } from './newAccount';
import { transfer } from './transfer';
import { addAuth } from './addAuth';
import { deployContract } from './deployContract';
import { addEosioCode } from './addEosioCode';
import { printCliHelp } from '..';
import { vestingMigrate } from './vestingMigrateAllocate';

const eosioMsigContract = EosioMsigContract.Instance;

const governanceAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
let newGovernanceAccounts = ['14.found.tmy', '5.found.tmy', '11.found.tmy', '12.found.tmy', '13.found.tmy'];

if (!settings.isProduction()) {
    newGovernanceAccounts = governanceAccounts;
}

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

    const proposer = newGovernanceAccounts[0];
    let signingKey: string | undefined = process.env.SIGNING_KEY;

    if (!signingKey) {
        if (!process.env.TONOMY_BOARD_PRIVATE_KEYS)
            throw new Error('Neither SIGNING_KEY or TONOMY_BOARD_PRIVATE_KEYS are set');
        const tonomyGovKeys: string[] = JSON.parse(process.env.TONOMY_BOARD_PRIVATE_KEYS).keys;

        signingKey = tonomyGovKeys[0];
    }

    const privateKey = PrivateKey.from(signingKey);
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
            await govMigrate(
                { newGovernanceAccounts },
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: governanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'new-account') {
            await newAccount(
                { governanceAccounts },
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: newGovernanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'transfer') {
            const from = 'team.tmy';
            const to = 'advteam.tmy';

            await transfer(
                { from, to },
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: newGovernanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'deploy-contract') {
            const contractName = args[3];

            await deployContract(
                { contractName },
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: newGovernanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'eosio.code-permission') {
            await addEosioCode({
                proposer,
                proposalName,
                privateKey,
                requested: newGovernanceAccounts,
                test,
            });
        } else if (proposalType === 'add-auth') {
            await addAuth(
                {
                    account: 'coinsale.tmy',
                    permission: 'active',
                    newDelegate: settings.isProduction() ? '14.found.tmy' : governanceAccounts[2],
                },
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: newGovernanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'vesting-migrate') {
            await vestingMigrate(
                {},
                {
                    proposer,
                    proposalName,
                    privateKey,
                    requested: newGovernanceAccounts,
                    test,
                }
            );
        } else if (proposalType === 'vesting-bulk') {
            const csvFilePath = '/home/dev/Downloads/allocate.csv';

            console.log('Reading file: ', csvFilePath);
            const sender = settings.isProduction() ? 'advteam.tmy' : 'team.tmy';
            const requiredAuthority = test ? governanceAccounts[2] : '11.found.tmy';
            const categoryId = 7; // Community and Marketing, Platform Dev, Infra Rewards
            const leosPrice = 0.0002; // Seed early bird price
            // const leosPrice = 0.0004; // Seed later comer price
            // const leosPrice = 0.0012; // TGE price

            const records = parse(fs.readFileSync(csvFilePath, 'utf8'), {
                columns: true,
                // eslint-disable-next-line camelcase
                skip_empty_lines: true,
            });
            const results: { accountName: string; usdQuantity: number }[] = [];

            const unfoundAccounts: string[] = [];

            await Promise.all(
                records.map(async (data: any) => {
                    // accountName, usdQuantity
                    if (!data.accountName || !data.usdQuantity) {
                        throw new Error(`Invalid CSV format on line ${results.length + 1}: ${data}`);
                    }

                    // check account exists
                    try {
                        await getAccount(data.accountName);

                        data.usdQuantity = Number(data.usdQuantity);

                        if (isNaN(data.usdQuantity)) {
                            throw new Error(`Invalid quantity type on line ${results.length + 1}: ${data}`);
                        }

                        if (data.usdQuantity <= 0 || data.usdQuantity > 100000) {
                            throw new Error(`Invalid quantity on line ${results.length + 1}: ${data}`);
                        }

                        results.push(data);
                    } catch (e) {
                        if (e instanceof SdkError && e.code === SdkErrors.AccountDoesntExist) {
                            unfoundAccounts.push(data.accountName);
                        } else {
                            throw e;
                        }
                    }
                })
            );

            if (unfoundAccounts.length > 0) {
                console.log(
                    `${unfoundAccounts.length} accounts were not found in environment ${settings.env}:`,
                    unfoundAccounts
                );
                process.exit(1);
            }

            const actions = results.map((data) => {
                const leosNumber = data.usdQuantity / leosPrice;

                const leosQuantity = leosNumber.toFixed(0) + '.000000 LEOS';

                console.log(
                    `Assigning: ${leosQuantity} ($${data.usdQuantity} USD) vested in category ${categoryId} to ${data.accountName} at rate of $${leosPrice}/LEOS`
                );
                return {
                    account: 'vesting.tmy',
                    name: 'assigntokens',
                    authorization: [
                        {
                            actor: sender.toString(),
                            permission: 'active',
                        },
                    ],
                    data: {
                        sender,
                        holder: data.accountName,
                        amount: leosQuantity,
                        category: categoryId,
                    },
                };
            });

            console.log(`Total ${actions.length} accounts to be paid`);

            const proposalHash = await createProposal(proposer, proposalName, actions, privateKey, [requiredAuthority]);

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else if (proposalType === 'add-prod') {
            const producer = '1.found.tmy';
            const signingKey = PublicKey.from('EOS6A3TosyQZPa9g186tqVFa52AfLdkvaosy1XVEEgziuAyp5PMUj');

            // fetch the existing schedule and their keys
            const { pending, proposed, active } = await getProducers();

            if (pending || proposed) throw new Error("Can't add a producer while there is a pending schedule");

            if (active.producers.find((p) => p.producer_name.equals(producer)))
                throw new Error('Producer already in the schedule');

            const newSchedule = active.producers.map((p) => {
                return {
                    // eslint-disable-next-line camelcase
                    producer_name: p.producer_name,
                    authority: [
                        'block_signing_authority_v0',
                        {
                            threshold: 1,
                            keys: p.authority[1].keys.map((k) => {
                                return {
                                    key: k.key,
                                    weight: k.weight,
                                };
                            }),
                        },
                    ],
                };
            });

            newSchedule.push({
                // eslint-disable-next-line camelcase
                producer_name: Name.from(producer),
                authority: [
                    'block_signing_authority_v0',
                    {
                        threshold: 1,
                        keys: [
                            {
                                key: signingKey,
                                weight: Weight.from(1),
                            },
                        ],
                    },
                ],
            });
            const action = {
                account: 'tonomy',
                name: 'setprods',
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
                    schedule: newSchedule,
                },
            };

            const proposalHash = await createProposal(
                proposer,
                proposalName,
                [action],
                privateKey,
                newGovernanceAccounts
            );

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else if (proposalType === 'remove-prod') {
            const producer = '1.found.tmy';

            // fetch the existing schedule and their keys
            const { pending, proposed, active } = await getProducers();

            if (pending || proposed) throw new Error("Can't remove a producer while there is a pending schedule");

            if (!active.producers.find((p) => p.producer_name.equals(producer)))
                throw new Error('Producer not in the schedule');

            const newSchedule = active.producers
                .filter((p) => !p.producer_name.equals(producer))
                .map((p) => {
                    return {
                        // eslint-disable-next-line camelcase
                        producer_name: p.producer_name,
                        authority: [
                            'block_signing_authority_v0',
                            {
                                threshold: 1,
                                keys: p.authority[1].keys.map((k) => {
                                    return {
                                        key: k.key,
                                        weight: k.weight,
                                    };
                                }),
                            },
                        ],
                    };
                });

            const action = {
                account: 'tonomy',
                name: 'setprods',
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
                    schedule: newSchedule,
                },
            };

            const proposalHash = await createProposal(
                proposer,
                proposalName,
                [action],
                privateKey,
                newGovernanceAccounts
            );

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else {
            throw new Error(`Invalid msig proposal type ${proposalType}`);
        }
    } else if (args[0] === 'approve') {
        const proposalName = Name.from(args[1]);

        try {
            const transaction = await eosioMsigContract.approve(proposer, proposalName, proposer, undefined, signer);

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            console.error('Transaction failed');
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
        printCliHelp();
        throw new Error(`Invalid msig command ${args[0]}`);
    }
}

export async function createProposal(
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
        if (e?.error?.details[0]?.message === 'assertion failure with message: transaction authorization failed') {
            throw new Error(
                'The transaction authorization requirements are not correct. Check the action authorizations are correct, and the "requested" permissions.'
            );
        } else {
            console.error('Error: ', JSON.stringify(e, null, 2));
            throw new Error('Transaction failed');
        }
    }
}

export async function executeProposal(proposer: string, proposalName: Name, proposalHash: Checksum256) {
    if (!process.env.TONOMY_BOARD_PRIVATE_KEYS) throw new Error('TONOMY_BOARD_PRIVATE_KEYS not set');
    const tonomyGovKeys: string[] = JSON.parse(process.env.TONOMY_BOARD_PRIVATE_KEYS).keys;
    const tonomyGovSigners = tonomyGovKeys.map((key) => createSigner(PrivateKey.from(key)));

    try {
        for (let i = 0; i < 2; i++) {
            await eosioMsigContract.approve(
                proposer,
                proposalName,
                governanceAccounts[i],
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

export type StandardProposalOptions = {
    proposer: string;
    proposalName: Name;
    privateKey: PrivateKey;
    requested: string[];
    test?: boolean;
};
