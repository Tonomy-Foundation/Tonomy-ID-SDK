import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { AccountType, getSettings, tonomyContract, TonomyUsername } from '../../sdk';

export async function newApp(options: StandardProposalOptions) {
    const appName = 'Fiddl.Art';
    const description = 'Create and Earn with AI Art';
    const logoUrl = 'https://fiddl.art/fiddlLogoWithText.png';
    const origin = 'https://fiddl.art';
    const usernameShort = 'fiddlart';
    const username = TonomyUsername.fromUsername(usernameShort, AccountType.APP, getSettings().accountSuffix);
    const key = 'EOS4xnrCGUT688wFvinQoCuiu7E3Qpn8Phq76TRKNTb87XFMjzsJu';

    const jsonData = JSON.stringify({
        app_name: appName,
        description,
        logo_url: logoUrl,
        background_color: '#000000',
        accent_color: '#FFFFFF',
    });
    const action = tonomyContract.actions.newApp({
        usernameHash: username.usernameHash,
        origin,
        key,
        jsonData,
    });

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
