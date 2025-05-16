/* eslint-disable camelcase */
import { Name } from '@wharfkit/antelope';
import { createProposal, executeProposal, StandardProposalOptions } from '.';
import { buyRam } from './buyram';
import { AccountType, getSettings, TonomyUsername } from '../../sdk';

export async function buyRamAndAppSetup(options: StandardProposalOptions) {
    await buyRam({
        contract: 'bridge.cxc',
        options: { ...options, proposalName: Name.from(options.proposalName.toString() + '1a') },
    });
    await buyRam({
        contract: 'invite.cxc',
        options: { ...options, proposalName: Name.from(options.proposalName.toString() + '1b') },
    });
    await buyRam({
        contract: 'tokens.cxc',
        options: { ...options, proposalName: Name.from(options.proposalName.toString() + '1c') },
    });

    const contract = `${name}.hypha`;
    const appName = `cXc.world`;
    const username = `cXc`;
    const description = `cXc.world is the tokenized Reddit, on a map. Subreddits become districts and nations where music competes to represent the area. One song can go to the top of the world of music, as charts grow and reset daily. Upvote once per 5 minutes. Buy Music NFTs from artists. Use BLUX to boost songs to #1. `;
    const logoUrl = 'https://ipfs.hivebp.io/ipfs/Qmexh5r5zJ7Us4Wm3tgedDSHss5t7DrDD8bDRLhz9eQi46';
    const origin = `https://music.cxc.world`;
    const tonomyUsername = TonomyUsername.fromUsername(username, AccountType.APP, getSettings().accountSuffix);

    const adminSetAppAction = {
        authorization: [
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        account: 'tonomy',
        name: 'adminsetapp',
        data: {
            account_name: Name.from(contract),
            app_name: appName,
            description,
            username_hash: tonomyUsername.usernameHash,
            logo_url: logoUrl,
            origin,
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [adminSetAppAction],
        options.privateKey,
        [...options.requested, contract],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
