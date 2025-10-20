import { getTonomyEosioProxyContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { getDeployableFiles } from '../bootstrap/deploy-contract';

export async function deployContract(
    options: {
        contract: string;
        directory?: string;
        returnActions?: boolean;
    } & StandardProposalOptions
) {
    const { wasmFile, abiFile } = getDeployableFiles(options.contract, options.directory);

    const actions = await getTonomyEosioProxyContract().deployContractActions(options.contract, wasmFile, abiFile, {
        actor: 'tonomy',
        permission: 'active',
    });

    if (options.returnActions ?? false) return actions;

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [...options.requested, options.contract],
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
    return;
}
