import { tonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { Name, ABI, Serializer } from '@wharfkit/antelope';
import fs from 'fs';
import { getDeployableFilesFromDir } from '../bootstrap/deploy-contract';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const thisFileDirectory = __dirname;
const defaultContractDirectory = path.join(thisFileDirectory, '..', '..', 'Tonomy-Contracts', 'contracts');

console.log('defaultContractDirectory', defaultContractDirectory);

export async function deployContract(
    options: {
        contract: string;
        directory?: string;
        returnActions?: boolean;
    } & StandardProposalOptions
) {
    const contractName = Name.from(options.contract);
    const contractDir = `${options.directory ?? defaultContractDirectory}/${contractName.toString()}`;

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

    const actions = await tonomyEosioProxyContract.deployContractActions(contractName, wasm, abiSerializedHex, {
        actor: 'tonomy',
        permission: 'active',
    });

    if (options.returnActions ?? false) return actions;

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
    return;
}
