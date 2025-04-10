import { ActionData } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name, ABI, Serializer } from '@wharfkit/antelope';
import fs from 'fs';
import { getDeployableFilesFromDir } from '../bootstrap/deploy-contract';

export async function deployContract(
    args: {
        contractName: string;
        contractDir: string;
        returnActions?: boolean;
    },
    options: StandardProposalOptions
) {
    const contractName = Name.from(args.contractName);
    const contractDir = args.contractDir;

    if (!contractName) {
        throw new Error('Contract name must be provided for deploy-contract proposal');
    }

    const contractInfo = {
        account: contractName,
        contractDir,
    };

    const { wasmPath, abiPath } = getDeployableFilesFromDir(contractInfo.contractDir);

    const wasmFile = fs.readFileSync(wasmPath);
    const abiFile = fs.readFileSync(abiPath, 'utf8');
    const wasm = wasmFile.toString(`hex`);

    // 2. Prepare SETABI
    const abi = JSON.parse(abiFile);
    const abiDef = ABI.from(abi);
    const abiSerializedHex = Serializer.encode({ object: abiDef }).hexString;

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

    const actions = [setCodeAction, setAbiAction];

    if (args.returnActions ?? false) return actions;

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
    return;
}
