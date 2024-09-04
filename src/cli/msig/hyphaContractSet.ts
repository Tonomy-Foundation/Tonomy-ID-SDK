import { Name } from '@wharfkit/antelope';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { AccountType, bytesToTokens, getSettings, TonomyUsername } from '../../sdk';

// @ts-expect-error args not used
export async function hyphaContractSet(args: any, options: StandardProposalOptions) {
    const contract = 'dao.hypha';
    const appName = 'Hypha DAO';
    const username = 'hyphadao';
    const description = 'Hypha DAO contract';
    const logoUrl = 'https://hypha.earth/wp-content/themes/hypha2023/img/logos/logo-white.svg';
    const origin = 'https://hypha.earth';
    const ramKb = 30000;
    // const contractDir = '/home/dev/Downloads/pangea-hypha-deploy';
    // const filename = 'dao';

    const tonomyUsername = TonomyUsername.fromUsername(username, AccountType.APP, getSettings().accountSuffix);
    const tokens = bytesToTokens(ramKb * 1000);

    console.log(`Setting up hypha contract "${contract}" with ${tokens} tokens to buy ${ramKb}KB of RAM`);

    // const wasmFile = `${contractDir}/${filename}.wasm`;
    // const abiFile = `${contractDir}/${filename}.abi`;

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

    const transferTokensAction = {
        authorization: [
            {
                actor: 'partners.tmy',
                permission: 'active',
            },
        ],
        account: 'eosio.token',
        name: 'transfer',
        data: {
            from: 'partners.tmy',
            to: contract,
            quantity: tokens,
            memo: `RAM for ${contract}`,
        },
    };

    const buyRamAction = {
        account: 'tonomy',
        name: 'buyram',
        authorization: [
            {
                actor: contract,
                permission: 'active',
            },
        ],
        data: {
            dao_owner: contract,
            app: contract,
            quant: tokens,
        },
    };

    // const deployContractAction = {
    //     account: 'tonomy',
    //     name: 'deployapp',
    //     authorization: [
    //         {
    //             actor: contract,
    //             permission: 'active',
    //         },
    //     ],
    //     data: {
    //         account: contract,
    //         wasm_file: wasmFile,
    //         abi_file: abiFile,
    //     },
    // };

    console.log('buyRamAction', buyRamAction);
    const actions = [adminSetAppAction, transferTokensAction, buyRamAction];

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        options.requested
    );

    if (options.test) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
