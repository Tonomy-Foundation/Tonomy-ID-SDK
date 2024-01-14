import deployContract from './deploy-contract';
import path from 'path';
import { createAntelopeAccount, createApp } from './create-account';
import {
    DemoTokenContract,
    setSettings,
    EosioTokenContract,
    EosioContract,
    AccountTypeEnum,
    TonomyContract,
    EosioUtil,
} from '../../sdk/index';
import { signer, updateAccountKey, updateControlByAccount } from './keys';
import settings from './settings';
import { PrivateKey, PublicKey } from '@wharfkit/antelope';
import { Signer } from '../../sdk/services/blockchain';

import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';

if (process.env.LOG === 'true') {
    settings.config.loggerLevel = 'debug';
}

setSettings(settings.config);

const demoTokenContract = DemoTokenContract.Instance;
const tokenContract = EosioTokenContract.Instance;
const tonomyContract = TonomyContract.Instance;
const eosioContract = EosioContract.Instance;
const ramPrice = 173333.3333; // bytes/token
const fee = 0.25 / 100; // 0.25%
const ramAvailable = 8 * 1024 * 1024 * 1024; // 8 GB
const currencySymbol = 'SYS';

/**
 * Converts bytes to tokens.
 *
 * @param bytes The number of bytes to convert.
 * @returns The converted value in tokens.
 */
function bytesToTokens(bytes: number): string {
    return ((bytes * (1 + fee)) / ramPrice).toFixed(4) + ` ${currencySymbol}`;
}

export default async function bootstrap(args: string[]) {
    if (!args[0]) throw new Error('Missing public key argument');

    try {
        const newPrivateKey = PrivateKey.from(args[0]);
        const newPublicKey = newPrivateKey.toPublic();
        const newSigner = EosioUtil.createSigner(newPrivateKey);

        await createAccounts();
        await setPrivilegedAccounts();
        await deployEosioMsig();
        await createDemoToken();
        await createNativeToken();
        await createTokenDistribution();
        await createTonomyContractAndSetResources();
        await createUsers();
        await createTonomyApps(newPublicKey);
        await updateAccountControllers(newPublicKey);
        await deployEosioTonomy(newSigner);

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error('Bootstrap error', e.message, JSON.stringify(e, null, 2));
        process.exit(1);
    }
}

async function createAccounts() {
    console.log('Create accounts');
    await createAntelopeAccount({ account: 'found.tmy' }, signer);

    // found.tmy should control the following accounts
    await createAntelopeAccount({ account: 'gov.tmy' }, signer);
    await createAntelopeAccount({ account: 'team.tmy' }, signer);
    await createAntelopeAccount({ account: 'prod1.tmy' }, signer);
    await createAntelopeAccount({ account: 'prod2.tmy' }, signer);
    await createAntelopeAccount({ account: 'prod3.tmy' }, signer);

    // gov.tmy should control the following accounts
    await createAntelopeAccount({ account: 'ecosystm.tmy' }, signer);
    await createAntelopeAccount({ account: 'private1.tmy' }, signer);
    await createAntelopeAccount({ account: 'private2.tmy' }, signer);
    await createAntelopeAccount({ account: 'private3.tmy' }, signer);
    await createAntelopeAccount({ account: 'public1.tmy' }, signer);
    await createAntelopeAccount({ account: 'public2.tmy' }, signer);
    await createAntelopeAccount({ account: 'public3.tmy' }, signer);
    await createAntelopeAccount({ account: 'ops.tmy' }, signer);

    // opts.tmy should control the following accounts
    await createAntelopeAccount({ account: 'tonomy' }, signer);
    await createAntelopeAccount({ account: 'demo.tmy' }, signer);
    await createAntelopeAccount({ account: 'eosio.msig' }, signer);
    await createAntelopeAccount({ account: 'eosio.token' }, signer);
}

async function setPrivilegedAccounts() {
    console.log('Set privledged accounts');
    await eosioContract.setPriv('tonomy', 1, signer);
    await eosioContract.setPriv('eosio.msig', 1, signer);
}

async function deployEosioMsig() {
    console.log('Deploy eosio.msig contract');
    await deployContract(
        {
            account: 'eosio.msig',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.msig'),
        },
        signer
    );
}

async function createDemoToken() {
    console.log('Create and deploy demo contract');
    await deployContract(
        {
            account: 'demo.tmy',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/demo.tmy'),
        },
        signer
    );
    await demoTokenContract.create(`1000000000 ${currencySymbol}`, signer);
    await demoTokenContract.issue(`10000 ${currencySymbol}`, signer);
}

async function createNativeToken() {
    console.log('Create and deploy native token contract');
    await deployContract(
        {
            account: 'eosio.token',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.token'),
        },
        signer
    );
    await tokenContract.create(`50000000000.0000 ${currencySymbol}`, signer);
    await tokenContract.issue('eosio.token', `50000000000.0000 ${currencySymbol}`, signer);
}

async function createTokenDistribution() {
    console.log('Create token distribution');
    const totalSupply = 50000000000.0;
    const allocations = {
        'ecosystm.tmy': 0.3 * totalSupply,
        'team.tmy': 0.15 * totalSupply,
        'private1.tmy': 0.025 * totalSupply,
        'private2.tmy': 0.025 * totalSupply,
        'private3.tmy': 0.025 * totalSupply,
        'public1.tmy': 0.025 * totalSupply,
        'public2.tmy': 0.025 * totalSupply,
        'public3.tmy': 0.025 * totalSupply,
        'ops.tmy': 0.4 * totalSupply,
    };

    for (const [account, amount] of Object.entries(allocations)) {
        await tokenContract.transfer('eosio.token', account, amount.toString() + `.0000 ${currencySymbol}`, signer);
    }
}

async function createTonomyContractAndSetResources() {
    console.log('Deploy Tonomy system contract');
    await deployContract(
        {
            account: 'tonomy',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/tonomy'),
        },
        signer
    );

    console.log('Set App account type');
    await tonomyContract.setAccountType('eosio', AccountTypeEnum.App, signer);
    await tonomyContract.setAccountType('eosio.token', AccountTypeEnum.App, signer);
    await tonomyContract.setAccountType('tonomy', AccountTypeEnum.App, signer);

    console.log('Set Tonomy system contract params and allocate RAM');
    await tonomyContract.setResourceParams(ramPrice, ramAvailable, fee, signer);

    console.log('Allocate RAM to system accounts');
    await tonomyContract.buyRam('ops.tmy', 'eosio', bytesToTokens(4680000), signer);
    await tonomyContract.buyRam('ops.tmy', 'eosio.token', bytesToTokens(2400000), signer);
    await tonomyContract.buyRam('ops.tmy', 'tonomy', bytesToTokens(4680000), signer);
}

async function createUsers() {
    // The Apple app needs to have a test user for their review. That is this user.
    let password = '1GjGtP%g5UOp2lQ&U5*p';

    mockCreateAccount();
    await createUser('testuser', password);

    // Create users for the demo website
    password = 'mrOOR1WW0y#6ot7z%Wbj';
    await createUser('lovesboost', password);
    await createUser('sweetkristy', password);
    await createUser('cheesecakeophobia', password);
    await createUser('ultimateBeast', password);
    await createUser('tomtom', password);
    await createUser('readingpro', password);
    await createUser('sohappy', password);
    await createUser('reallychel', password);
    await createUser('thedudeabides', password);
    await createUser('4cryingoutloud', password);

    restoreCreateAccountFromMock();
}

async function createTonomyApps(newPublicKey: PublicKey) {
    const demo = await createApp({
        appName: 'Tonomy Demo',
        usernamePrefix: 'demo',
        description: 'Demo of Tonomy ID login and features',
        origin: settings.config.demoWebsiteOrigin,
        logoUrl: settings.config.demoWebsiteOrigin + '/market.com.png',
        publicKey: newPublicKey,
    });

    // action to add demo permission to token contract
    // TODO this can be removed, the account name will always be `get_self()`
    console.log('Adding demo permission to token contract');
    demoTokenContract.addPerm(demo.accountName, signer);

    await createApp({
        appName: 'Tonomy Website',
        usernamePrefix: 'tonomy',
        description: 'Tonomy website to manager your ID and Data',
        origin: settings.config.ssoWebsiteOrigin,
        logoUrl: settings.config.ssoWebsiteOrigin + '/tonomy-logo1024.png',
        publicKey: newPublicKey,
    });
}

async function updateAccountControllers(newPublicKey: PublicKey) {
    console.log('Change the key of the accounts to the new key', newPublicKey.toString());
    await updateAccountKey('found.tmy', newPublicKey);

    // accounts controlled by found.tmy
    await updateControlByAccount('gov.tmy', 'found.tmy', signer);
    await updateControlByAccount('team.tmy', 'found.tmy', signer);
    await updateControlByAccount('prod1.tmy', 'found.tmy', signer);
    await updateControlByAccount('prod2.tmy', 'found.tmy', signer);
    await updateControlByAccount('prod3.tmy', 'found.tmy', signer);

    // accounts controlled by gov.tmy
    await updateControlByAccount('ops.tmy', 'gov.tmy', signer);
    await updateControlByAccount('ecosystm.tmy', 'gov.tmy', signer);
    await updateControlByAccount('private1.tmy', 'gov.tmy', signer);
    await updateControlByAccount('private2.tmy', 'gov.tmy', signer);
    await updateControlByAccount('private3.tmy', 'gov.tmy', signer);
    await updateControlByAccount('public1.tmy', 'gov.tmy', signer);
    await updateControlByAccount('public2.tmy', 'gov.tmy', signer);
    await updateControlByAccount('public3.tmy', 'gov.tmy', signer);

    //accounts controlled by ops.tmy (contracts that are called by inline actions need eosio.code permission)
    await updateControlByAccount('tonomy', 'ops.tmy', signer, true);
    await updateControlByAccount('eosio.token', 'ops.tmy', signer);
    await updateControlByAccount('eosio.msig', 'ops.tmy', signer);
    await updateControlByAccount('demo.tmy', 'ops.tmy', signer);

    // Update the system contract
    await updateControlByAccount('eosio', 'tonomy', signer);
}

async function deployEosioTonomy(signer: Signer) {
    console.log('Deploy eosio.tonomy contract');
    await deployContract(
        {
            account: 'eosio',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.tonomy'),
        },
        signer,
        {
            actor: 'tonomy',
            permission: 'active',
        }
    );
}
