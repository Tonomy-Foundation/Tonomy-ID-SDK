import { TOTAL_RAM_AVAILABLE, RAM_FEE, getTonomyContract, calculateRamPrice } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';

// @ts-expect-error args not used
export async function setResourceConfig(args, options: StandardProposalOptions) {
    const ramPrice = await calculateRamPrice();
    const action = getTonomyContract().actions.setResParams({
        ramPrice,
        totalRamAvailable: TOTAL_RAM_AVAILABLE,
        ramFee: RAM_FEE,
    });

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (!options.dryRun && options.autoExecute)
        await executeProposal(options.proposer, options.proposalName, proposalHash);
}
