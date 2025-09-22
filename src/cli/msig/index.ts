import { PrivateKey, Name, Checksum256, NameType } from '@wharfkit/antelope';
import { EosioMsigContract } from '../../sdk';
import { ActionData, createSigner } from '../../sdk/services/blockchain';
import settings from '../settings';
import { newAccount } from './accounts';
import { transfer } from './token';
import { updateAuth, govMigrate, addEosioCode } from './auth';
import { deployContract } from './contract';
import { printCliHelp } from '..';
import { setResourceConfig } from './setResourceConfig';
import { setBlockchainConfig } from './setBlockchainConfig';
import { addProd, changeProds, removeProd, updateProd } from './producers';
import { hyphaAccountsCreate, hyphaContractSet, hyphaAddAccountPermissions } from './hypha';
import { sleep } from '../../sdk/util';
import { vestingMigrate, vestingMigrate2, vestingMigrate3, vestingBulk } from './vesting';
import {
    createStakingTmyAccount,
    deployStakingContract,
    reDeployEosioContract,
    reDeployTonomyContract,
    reDeployVestingContract,
    stakingContractSetup,
    stakingSettings,
} from './staking';
import { symbolMigrate, migrateRebrandApps } from './symbolMigrate';
import { createAccounts, deployContracts, setAppsAndRam, newApp, migrateApps } from './apps';

const eosioMsigContract = EosioMsigContract.Instance;

const governanceAccounts = ['1.found.tmy', '2.found.tmy', '3.found.tmy'];
let newGovernanceAccounts = ['14.found.tmy', '5.found.tmy', '11.found.tmy', '12.found.tmy', '13.found.tmy'];

if (!settings.isProduction()) {
    newGovernanceAccounts = governanceAccounts;
}

export default async function msig(args: string[]) {
    let autoExecute = false,
        dryRun = false;

    for (const arg of args) {
        if (arg.includes('--help')) {
            printMsigHelp();
            return;
        } else if (arg.includes('--auto-execute')) {
            console.log('Will attempt to execute the proposal');

            if (settings.isProduction()) {
                throw new Error(`Cannot test proposal on a live environment. Environment: ${settings.env}`);
            }

            autoExecute = true;

            args.splice(args.indexOf(arg), 1);
            newGovernanceAccounts = governanceAccounts;
        } else if (arg.includes('--dry-run')) {
            console.log('Dry run proposal');

            dryRun = true;

            args.splice(args.indexOf(arg), 1);
        }
    }

    const proposer = newGovernanceAccounts[0];
    let signingKey: string | undefined = process.env.SIGNING_KEY;
    const signingAccount = '14.found.tmy';

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
            const transaction = await eosioMsigContract.cancel(proposer, proposalName, signingAccount, signer);

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            console.error('Transaction failed');
        }
    } else if (args[0] === 'propose') {
        const proposalType = args[1];
        const proposalSubtype = args[2];
        const proposalName = !proposalSubtype ? Name.from(args[2]) : Name.from(args[3]);

        const options = {
            proposer,
            proposalName,
            privateKey,
            requested: newGovernanceAccounts,
            autoExecute,
            dryRun,
        };

        if (proposalType === 'accounts') {
            if (proposalSubtype === 'create') {
                await newAccount({ governanceAccounts }, options);
            } else printMsigHelp();
        } else if (proposalType === 'tokens') {
            if (proposalSubtype === 'transfer') {
                await transfer(options);
            } else printMsigHelp();
        } else if (proposalType === 'contract') {
            if (proposalSubtype === 'deploy') {
                const contractName = args[4] ?? 'tonomy';

                await deployContract({ contract: contractName, ...options });
            } else printMsigHelp();
        } else if (proposalType === 'auth') {
            if (proposalSubtype === 'add-eosiocode') {
                await addEosioCode(options);
            } else if (proposalSubtype === 'update') {
                await updateAuth(options);
            } else if (proposalSubtype === 'gov-migrate') {
                await govMigrate(
                    { newGovernanceAccounts },
                    {
                        ...options,
                        requested: governanceAccounts,
                    }
                );
            } else printMsigHelp();
        } else if (proposalType === 'vesting') {
            if (proposalSubtype === 'migrate') {
                await vestingMigrate(options);
            } else if (proposalSubtype === 'migrate2') {
                await vestingMigrate2(options);
            } else if (proposalSubtype === 'migrate3') {
                await vestingMigrate3(options);
            } else if (proposalSubtype === 'bulk') {
                await vestingBulk({ governanceAccounts }, options);
            } else printMsigHelp();
        } else if (proposalType === 'producers') {
            if (proposalSubtype === 'add') {
                await addProd({}, options);
            } else if (proposalSubtype === 'remove') {
                await removeProd({}, options);
            } else if (proposalSubtype === 'update') {
                await updateProd({}, options);
            } else if (proposalSubtype === 'change') {
                await changeProds({}, options);
            } else printMsigHelp();
        } else if (proposalType === 'hypha') {
            if (proposalSubtype === 'accounts-create') {
                await hyphaAccountsCreate({}, options);
            } else if (proposalSubtype === 'add-permissions') {
                await hyphaAddAccountPermissions({}, options);
            } else if (proposalSubtype === 'contract-set') {
                await hyphaContractSet({}, options);
            } else printMsigHelp();
        } else if (proposalType === 'apps') {
            if (proposalSubtype === 'create') {
                await newApp(options);
            } else if (proposalSubtype === 'accounts-create') {
                await createAccounts(options);
            } else if (proposalSubtype === 'set-apps-and-ram') {
                await setAppsAndRam(options);
            } else if (proposalSubtype === 'deploy-contracts') {
                await deployContracts(options);
            } else if (proposalSubtype === 'migrate') {
                await migrateApps(options);
            } else printMsigHelp();
        } else if (proposalType === 'res-config-set') {
            await setResourceConfig({}, options);
        } else if (proposalType === 'set-chain-config') {
            await setBlockchainConfig({}, options);
        } else if (proposalType === 'staking') {
            if (proposalSubtype === 'account') {
                await createStakingTmyAccount(options);
            } else if (proposalSubtype === 'contract') {
                await stakingContractSetup(options);
            } else if (proposalSubtype === 'deploy-staking-contract') {
                await deployStakingContract(options);
            } else if (proposalSubtype === 'redeploy-vesting-contract') {
                await reDeployVestingContract(options);
            } else if (proposalSubtype === 'redeploy-eosio-contract') {
                await reDeployEosioContract(options);
            } else if (proposalSubtype === 'redeploy-tonomy-contract') {
                await reDeployTonomyContract(options);
            } else if (proposalSubtype === 'setSettings') {
                await stakingSettings(options);
            } else printMsigHelp();
        } else if (proposalType === 'symbol') {
            if (proposalSubtype === 'migrate') {
                await symbolMigrate(options);
            } else if (proposalSubtype === 'migrate-app') {
                await migrateRebrandApps(options);
            } else printMsigHelp();
        } else {
            throw new Error(`Invalid msig proposal type ${proposalType}`);
        }
    } else if (args[0] === 'approve') {
        const proposalName = Name.from(args[1]);

        try {
            const transaction = await eosioMsigContract.approve(
                proposer,
                proposalName,
                signingAccount,
                undefined,
                signer
            );

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            throw new Error('Transaction failed');
        }
    } else if (args[0] === 'exec') {
        const proposalName = Name.from(args[1]);

        try {
            const transaction = await eosioMsigContract.exec(proposer, proposalName, signingAccount, signer);

            console.log('Transaction: ', JSON.stringify(transaction, null, 2));
            console.error('Transaction succeeded');
        } catch (e) {
            console.error('Error: ', JSON.stringify(e, null, 2));
            throw new Error('Transaction failed');
        }
    } else {
        printCliHelp();
        throw new Error(`Invalid msig command ${args[0]}`);
    }
}

type PermissionLevelType = {
    actor: NameType;
    permission: NameType;
};

export async function createProposal(
    proposer: string,
    proposalName: Name,
    actions: ActionData[],
    privateKey: PrivateKey,
    requested: (string | PermissionLevelType)[],
    dryRun?: boolean
): Promise<Checksum256> {
    const requestedPermissions = requested.map((actor) => {
        if (typeof actor === 'string') {
            return {
                actor,
                permission: 'active',
            };
        }

        return {
            actor: actor.actor.toString(),
            permission: actor.permission.toString(),
        };
    });

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

    if (dryRun) {
        console.log('Dry run finished');
        // return a random hash to exit early
        return Checksum256.from('8e95684a0d281d0ed23ebf02f5888774dafb56d47174c4402122f05aef935bdd');
    }

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

export async function executeProposal(
    proposer: string,
    proposalName: Name,
    proposalHash: Checksum256,
    signingAccount?: NameType
) {
    if (!process.env.TONOMY_BOARD_PRIVATE_KEYS) throw new Error('TONOMY_BOARD_PRIVATE_KEYS not set');
    const tonomyGovKeys: string[] = JSON.parse(process.env.TONOMY_BOARD_PRIVATE_KEYS).keys;
    const tonomyGovSigners = tonomyGovKeys.map((key) => createSigner(PrivateKey.from(key)));

    try {
        for (let i = 0; i < 2; i++) {
            await sleep(1000);
            await eosioMsigContract.approve(
                proposer,
                proposalName,
                governanceAccounts[i],
                proposalHash,
                tonomyGovSigners[i]
            );
        }

        console.log('Proposal approved succeeded');

        await sleep(1000);
        await eosioMsigContract.exec(proposer, proposalName, signingAccount ?? proposer, tonomyGovSigners[0]);

        console.log('Proposal executed succeeded');
    } catch (e) {
        console.error('Error: ', JSON.stringify(e, null, 2));
        throw new Error('Transaction failed');
    }
}

export type StandardProposalOptions = {
    proposer: string;
    proposalName: Name;
    privateKey: PrivateKey;
    requested: string[];
    autoExecute: boolean;
    dryRun: boolean;
};

function printMsigHelp() {
    console.log(`
        Usage:
            yarn run cli msig [commands]
            
            Commands:
                approve stakeacc
                cancel <proposalName>
                exec <proposalName>
                propose accounts create <proposalName>
                propose apps create <proposalName>
                propose apps accounts-create <proposalName>
                propose apps set-apps-and-ram <proposalName>
                propose apps deploy-contracts <proposalName>
                propose apps migrate <proposalName>
                propose auth add-eosiocode <proposalName>
                propose auth gov-migrate <proposalName>
                propose auth update <proposalName>
                propose contract deploy <proposalName> <contractName>
                propose hypha accounts-create <proposalName>
                propose hypha add-permissions <proposalName>
                propose hypha contract-set <proposalName>
                propose producers add <proposalName>
                propose producers change <proposalName>
                propose producers remove <proposalName>
                propose producers update <proposalName>
                propose res-config-set <proposalName>
                propose set-chain-config <proposalName>
                propose staking account <proposalName>
                propose staking contract <proposalName>
                propose staking deploy-staking-contract <proposalName>
                propose staking redeploy-vesting-contract <proposalName>
                propose staking redeploy-eosio-contract <proposalName>
                propose staking redeploy-tonomy-contract <proposalName>
                propose staking setSettings <proposalName>
                propose symbol migrate <proposalName>
                propose tokens transfer <proposalName>
                propose vesting bulk <proposalName>
                propose vesting migrate <proposalName>
                propose vesting migrate2 <proposalName>
                propose vesting migrate3 <proposalName>
                propose ... --auto-execute
                propose ... --dry-run
        `);
}
