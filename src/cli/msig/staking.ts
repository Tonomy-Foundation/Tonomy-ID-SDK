/* eslint-disable camelcase */
import { amountToAsset, Authority, bytesToTokens, StakingContract } from '../../sdk/services/blockchain';
import { StandardProposalOptions, createProposal, executeProposal } from '.';
import { deployContract } from './deployContract';
import { createSubdomainOnOrigin, getAppUsernameHash } from '../bootstrap';
import { getAccountInfo } from '../../sdk';
import { Name } from '@wharfkit/antelope';
import { TOTAL_RAM_AVAILABLE, RAM_FEE, RAM_PRICE } from '../../sdk/services/blockchain';

//create staking.tmy account controlled by ops.tmy
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

    activeAuthority.addCodePermission('staking.tmy');
    ownerAuthority.addCodePermission('staking.tmy');

    const action = createNewAccountAction('staking.tmy', activeAuthority, ownerAuthority);

    console.log(action);
    //add staking permission to infra.tmy
    const accountInfo = await getAccountInfo(Name.from('infra.tmy'));

    const ownerPermission = accountInfo.getPermission('owner');
    const activePermission = accountInfo.getPermission('active');

    const ownerAuthorityInfra = Authority.fromAccountPermission(ownerPermission);
    const activeAuthorityInfra = Authority.fromAccountPermission(activePermission);

    // Add new eosio.code permission for staking.tmy
    ownerAuthorityInfra.addCodePermission('vesting.tmy');
    ownerAuthorityInfra.addCodePermission('staking.tmy');
    activeAuthorityInfra.addCodePermission('staking.tmy');
    activeAuthorityInfra.addCodePermission('vesting.tmy');

    const updateInfraOwnerPermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'infra.tmy',
                permission: 'owner',
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
            account: 'infra.tmy',
            permission: 'owner',
            parent: '',
            auth: ownerAuthority,

            auth_parent: false,
        },
    };

    const updateInfraActivePermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'infra.tmy',
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
            account: 'infra.tmy',
            permission: 'active',
            parent: 'owner',
            auth: activeAuthority,

            auth_parent: false,
        },
    };

    console.log('updateInfraOwnerPermission', JSON.stringify(activeAuthority, null, 2));
    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [updateInfraOwnerPermission, updateInfraActivePermission],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

export async function updateInfraTmyPermission(options: StandardProposalOptions) {
    //add staking permission to infra.tmy
    const accountInfo = await getAccountInfo(Name.from('infra.tmy'));

    const ownerPermission = accountInfo.getPermission('owner');
    const activePermission = accountInfo.getPermission('active');

    const ownerAuthorityInfra = Authority.fromAccountPermission(ownerPermission);
    const activeAuthorityInfra = Authority.fromAccountPermission(activePermission);

    // Add new eosio.code permission for staking.tmy and vesting.tmy
    ownerAuthorityInfra.addCodePermission('vesting.tmy');
    ownerAuthorityInfra.addCodePermission('staking.tmy');
    activeAuthorityInfra.addCodePermission('staking.tmy');
    activeAuthorityInfra.addCodePermission('vesting.tmy');

    const updateInfraOwnerPermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'infra.tmy',
                permission: 'owner',
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
            account: 'infra.tmy',
            permission: 'owner',
            parent: '',
            auth: ownerAuthority,

            auth_parent: false,
        },
    };

    const updateInfraActivePermission = {
        account: 'tonomy',
        name: 'updateauth',
        authorization: [
            {
                actor: 'infra.tmy',
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
            account: 'infra.tmy',
            permission: 'active',
            parent: 'owner',
            auth: activeAuthority,

            auth_parent: false,
        },
    };

    console.log('updateInfraOwnerPermission', JSON.stringify(activeAuthority, null, 2));
    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [updateInfraOwnerPermission, updateInfraActivePermission],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// call tonomy::adminSetApp() on the staking.tmy account
// call tonomy::buyRam() for the staking.tmy account
export async function stakingContractSetup(options: StandardProposalOptions) {
    const ramKb = 4680000;

    const contract = 'staking.tmy';

    const tonomyUsername = getAppUsernameHash('staking');
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
            username_hash: tonomyUsername,
            logo_url:
                createSubdomainOnOrigin('https://accounts.testnet.pangea.web4.world', 'staking') +
                '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin('https://accounts.testnet.pangea.web4.world', 'staking'),
        },
    };

    // const buyRamAction = {
    //     account: 'tonomy',
    //     name: 'buyram',
    //     authorization: [
    //         {
    //             actor: contract,
    //             permission: 'active',
    //         },
    //     ],
    //     data: {
    //         dao_owner: 'ops.tmy',
    //         app: contract,
    //         quant: tokens,
    //     },
    // };

    const setres = {
        authorization: [
            {
                actor: 'tonomy',
                permission: 'active',
            },
        ],
        account: 'tonomy',
        name: 'setresparams',
        data: {
            ram_price: RAM_PRICE,
            total_ram_available: TOTAL_RAM_AVAILABLE,
            ram_fee: RAM_FEE,
        },
    };

    const actions = [adminSetAppAction, setres];

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

export async function buyRam(options: StandardProposalOptions) {
    const ramKb = 4680000;

    const contract = 'staking.tmy';

    const tokens = bytesToTokens(ramKb * 1000);

    console.log(`Setting up hypha contract "${contract}" with ${tokens} tokens to buy ${ramKb}KB of RAM`);

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
            dao_owner: 'ops.tmy',
            app: contract,
            quant: tokens,
        },
    };

    const actions = [buyRamAction];

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

// deploy the new staking.tmy contract
export async function deployStakingContract(options: StandardProposalOptions) {
    const contract = 'staking.tmy';
    const directory = '/home/sadia/Tonomy-ID-Integration/Tonomy-ID-SDK/Tonomy-Contracts/contracts/';
    const contractDir = directory + `staking.tmy`;

    const deployActions = await deployContract({ contractName: contract, contractDir, returnActions: true }, options);

    if (!deployActions) throw new Error('Expected deployActions to be defined');

    const actions = [...deployActions];

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

// re-deploy the vesting contract
export async function reDeployVestingContract(options: StandardProposalOptions) {
    const directory = '/home/sadia/Tonomy-ID-Integration/Tonomy-ID-SDK/Tonomy-Contracts/contracts/';

    const vestingDeployActions = await deployContract(
        { contractName: 'vesting.tmy', contractDir: directory + 'vesting.tmy', returnActions: true },
        options
    );

    if (!vestingDeployActions) throw new Error('Expected vestingDeployActions to be defined');

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...vestingDeployActions],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// re-deploy the eosio contract
export async function reDeployEosioContract(options: StandardProposalOptions) {
    const directory = '/home/sadia/Tonomy-ID-Integration/Tonomy-ID-SDK/Tonomy-Contracts/contracts/';

    const eosioDeployActions = await deployContract(
        { contractName: 'eosio', contractDir: directory + 'eosio.tonomy', returnActions: true },
        options
    );

    if (!eosioDeployActions) throw new Error('Expected eosioDeployActions to be defined');

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...eosioDeployActions],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

// re-deploy the tonomy contracts
export async function reDeployTonomyContract(options: StandardProposalOptions) {
    const directory = '/home/sadia/Tonomy-ID-Integration/Tonomy-ID-SDK/Tonomy-Contracts/contracts/';

    const tonomyDeployActions = await deployContract(
        { contractName: 'tonomy', contractDir: directory + 'tonomy', returnActions: true },
        options
    );

    if (!tonomyDeployActions) throw new Error('Expected tonomyDeployActions to be defined');

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [...tonomyDeployActions],
        options.privateKey,
        [...options.requested],
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}

//setup staking by calling setSettings() and addYield()
export async function stakingSettings(options: StandardProposalOptions) {
    const setSettings = {
        authorization: [
            {
                actor: 'staking.tmy',
                permission: 'active',
            },
        ],
        account: 'staking.tmy',
        name: 'setsettings',
        data: {
            yearly_stake_pool: amountToAsset(StakingContract.yearlyStakePool, 'LEOS'),
        },
    };

    const setYearlyYield = {
        authorization: [
            {
                actor: 'infra.tmy',
                permission: 'active',
            },
        ],
        account: 'staking.tmy',
        name: 'addyield',
        data: {
            sender: 'infra.tmy',
            quantity: amountToAsset(StakingContract.yearlyStakePool / 2, 'LEOS'),
        },
    };

    const proposalHash = await createProposal(
        options.proposer,
        options.proposalName,
        [setSettings, setYearlyYield],
        options.privateKey,
        options.requested,
        options.dryRun
    );

    if (options.dryRun) return;
    if (options.autoExecute) await executeProposal(options.proposer, options.proposalName, proposalHash);
}
