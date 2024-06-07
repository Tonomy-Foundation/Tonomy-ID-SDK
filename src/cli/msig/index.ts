import { PrivateKey, Name, Checksum256, ABI, Serializer } from '@wharfkit/antelope';
import path from 'path';
import fs from 'fs';
import { EosioMsigContract, getAccountInfo, setSettings } from '../../sdk';
import { ActionData, Authority, createSigner } from '../../sdk/services/blockchain';
import settings from '../bootstrap/settings';
import { getDeployableFilesFromDir } from '../bootstrap/deploy-contract';
import { addCodePermissionTo } from '../bootstrap';
import { govMigrate } from './govMigrate';
import { newAccount } from './newAccount';
import { transfer } from './transfer';

const eosioMsigContract = EosioMsigContract.Instance;

const governanceAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
let newGovernanceAccounts = ['14.found.tmy', '5.found.tmy', '11.found.tmy', '12.found.tmy', '13.found.tmy'];

if (!settings.isProduction()) {
    newGovernanceAccounts.push(...governanceAccounts);
}

export default async function msig(args: string[]) {
    setSettings({
        blockchainUrl: settings.config.blockchainUrl,
        loggerLevel: settings.config.loggerLevel,
        currencySymbol: settings.config.currencySymbol,
    });

    console.log('Using environment', settings.env);

    let test = true;

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

            if (!contractName) {
                throw new Error('Contract name must be provided for deploy-contract proposal');
            }

            const contractInfo = {
                account: contractName,
                contractDir: path.join(__dirname, `../../Tonomy-Contracts/contracts/${contractName}`),
            };

            const { wasmPath, abiPath } = getDeployableFilesFromDir(contractInfo.contractDir);

            const wasmFile = fs.readFileSync(wasmPath);
            const abiFile = fs.readFileSync(abiPath, 'utf8');
            const wasm = wasmFile.toString(`hex`);

            // 2. Prepare SETABI
            const abi = JSON.parse(abiFile);
            const abiDef = ABI.from(abi);
            const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const actions: ActionData[] = [];

            // Prepare SETCODE action
            const setCodeAction: ActionData = {
                account: 'tonomy',
                name: 'setcode',
                authorization: [
                    {
                        actor: contractName.toString(),
                        permission: 'active',
                    },
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
                    account: contractName.toString(),
                    vmtype: 0,
                    vmversion: 0,
                    code: wasm,
                },
            };

            actions.push(setCodeAction);

            // Prepare SETABI action
            const setAbiAction: ActionData = {
                account: 'tonomy',
                name: 'setabi',
                authorization: [
                    {
                        actor: contractName.toString(),
                        permission: 'active',
                    },
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
                    account: contractName.toString(),
                    abi: abiSerializedHex,
                },
            };

            actions.push(setAbiAction);

            const proposalHash = await createProposal(
                proposer,
                proposalName,
                actions,
                privateKey,
                newGovernanceAccounts
            );

            if (test) await executeProposal(proposer, proposalName, proposalHash);
        } else if (proposalType === 'eosio.code-permission') {
            const actions = [];

            for (const account of addCodePermissionTo) {
                const accountInfo = await getAccountInfo(Name.from(account));

                const ownerPermission = accountInfo.getPermission('owner');
                const activePermission = accountInfo.getPermission('active');

                const ownerAuthority = new Authority(
                    ownerPermission.required_auth.threshold.toNumber(),
                    ownerPermission.required_auth.keys.map((keyWeight) => ({
                        key: keyWeight.key.toString(),
                        weight: keyWeight.weight.toNumber(),
                    })),
                    ownerPermission.required_auth.accounts.map((permissionWeight) => ({
                        permission: {
                            actor: permissionWeight.permission.actor.toString(),
                            permission: permissionWeight.permission.permission.toString(),
                        },
                        weight: permissionWeight.weight.toNumber(),
                    })),
                    ownerPermission.required_auth.waits.map((waitWeight) => ({
                        // eslint-disable-next-line camelcase
                        wait_sec: waitWeight.wait_sec.toNumber(),
                        weight: waitWeight.weight.toNumber(),
                    }))
                );
                const activeAuthority = new Authority(
                    activePermission.required_auth.threshold.toNumber(),
                    activePermission.required_auth.keys.map((keyWeight) => ({
                        key: keyWeight.key.toString(),
                        weight: keyWeight.weight.toNumber(),
                    })),
                    activePermission.required_auth.accounts.map((permissionWeight) => ({
                        permission: {
                            actor: permissionWeight.permission.actor.toString(),
                            permission: permissionWeight.permission.permission.toString(),
                        },
                        weight: permissionWeight.weight.toNumber(),
                    })),
                    activePermission.required_auth.waits.map((waitWeight) => ({
                        // eslint-disable-next-line camelcase
                        wait_sec: waitWeight.wait_sec.toNumber(),
                        weight: waitWeight.weight.toNumber(),
                    }))
                );

                activeAuthority.addCodePermission('vesting.tmy');
                ownerAuthority.addCodePermission('vesting.tmy');

                actions.push({
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: account,
                            permission: 'owner',
                        },
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
                        account: account,
                        permission: 'owner',
                        parent: '',
                        auth: ownerAuthority,
                        // eslint-disable-next-line camelcase
                        auth_parent: false,
                    },
                });

                actions.push({
                    account: 'tonomy',
                    name: 'updateauth',
                    authorization: [
                        {
                            actor: account,
                            permission: 'active',
                        },
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
                        account: account,
                        permission: 'active',
                        parent: 'owner',
                        auth: activeAuthority,
                        // eslint-disable-next-line camelcase
                        auth_parent: false,
                    },
                });
            }

            const proposalHash = await createProposal(
                proposer,
                proposalName,
                actions,
                privateKey,
                newGovernanceAccounts
            );

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

export async function executeProposal(proposer: string, proposalName: Name, proposalHash: Checksum256) {
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

export type StandardProposalOptions = {
    proposer: string;
    proposalName: Name;
    privateKey: PrivateKey;
    requested: string[];
    test?: boolean;
};
