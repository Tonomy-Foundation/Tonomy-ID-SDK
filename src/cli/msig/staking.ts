/* eslint-disable camelcase */
import { Authority, bytesToTokens } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { AccountType, TonomyUsername } from '../../sdk';
import { deployContract } from './deployContract';
import { createSubdomainOnOrigin } from '../bootstrap';

export async function createStakingTmyAccount(options: StandardProposalOptions) {
    function createNewAccountAction(name: string, active: Authority, owner: Authority) {
        return {
            account: 'tonomy',
            name: 'newaccount',
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
                creator: 'tonomy',
                name,
                owner,
                active,
            },
        };
    }

    const activeAuthority = Authority.fromAccount({ actor: 'ops.tmy', permission: 'active' });
    const ownerAuthority = Authority.fromAccount({ actor: 'ops.tmy', permission: 'owner' });
    const action = createNewAccountAction('stak.tmy', activeAuthority, ownerAuthority);

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [action],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function stakingContractSetup(options: StandardProposalOptions) {
    const ramKb = 4680000;

    const contract = 'staking.tmy';

    const contractDir = `/home/sadia/TonomyFoundation/january/Tonomy-ID-Integration/Tonomy-ID-SDK/Tonomy-Contracts/contracts/staking.tmy`;

    const tonomyUsername = TonomyUsername.fromUsername('staking', AccountType.APP, '.testnet.pangea');
    const tokens = bytesToTokens(ramKb * 1000);

    console.log(`Setting up hypha contract "${contract}" with ${tokens} tokens to buy ${ramKb}KB of RAM`);

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
            account_name: 'staking.tmy',
            app_name: 'LEOS Staking',
            description: 'LEOS Staking contract',
            username_hash: tonomyUsername.usernameHash,
            logo_url:
                createSubdomainOnOrigin('https://accounts.testnet.pangea.web4.world', 'staking') +
                '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin('https://accounts.testnet.pangea.web4.world', 'staking'),
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

    const deployActions = await deployContract({ contractName: contract, contractDir, returnActions: true }, options);

    if (!deployActions) throw new Error('Expected deployActions to be defined');

    const actions = [adminSetAppAction, buyRamAction, ...deployActions];

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        actions,
        options.privateKey,
        [...options.requested, contract],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
