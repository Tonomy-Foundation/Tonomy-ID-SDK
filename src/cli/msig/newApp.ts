import { Authority } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { AccountType, getSettings, TonomyUsername } from '../../sdk';

export async function newApp(options: StandardProposalOptions) {
    const appName = 'Fiddl.Art';
    const description = 'Create and Earn with AI Art';
    const logoUrl = 'https://fiddle.art/logo.png';
    const origin = 'https://fiddl.art';
    const usernameShort = 'fiddle';
    const username = TonomyUsername.fromUsername(usernameShort, AccountType.APP, getSettings().accountSuffix);
    const key = Authority.fromKey('EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB');

    const action = {
        account: 'tonomy',
        name: 'newapp',
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
            app_name: appName,
            description,
            logo_url: logoUrl,
            origin: origin,
            username_hash: username.usernameHash,
            key,
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
