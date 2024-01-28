import deployContract from './deploy-contract';
import path from 'path';
import { createAntelopeAccount, createApp } from './create-account';
import {
    DemoTokenContract,
    setSettings,
    EosioTokenContract,
    EosioContract,
    TonomyContract,
    EosioUtil,
    TonomyUsername,
    AccountType,
    getSettings,
} from '../../sdk/index';
import { getSigner, updateAccountKey, updateControlByAccount } from './keys';
import settings from './settings';
import { Checksum256, PrivateKey, PublicKey } from '@wharfkit/antelope';
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

// TODO move to settings
export const CURRENCY_SYMBOL = 'SYS';

/**
 * Converts bytes to tokens.
 *
 * @param bytes The number of bytes to convert.
 * @returns The converted value in tokens.
 */
function bytesToTokens(bytes: number): string {
    return ((bytes * (1 + fee)) / ramPrice).toFixed(4) + ` ${CURRENCY_SYMBOL}`;
}

const signer = getSigner();

export default async function bootstrap() {
    try {
        if (!process.env.TONOMY_OPS_PRIVATE_KEY) throw new Error('Missing TONOMY_OPS_PRIVATE_KEY');
        if (
            !process.env.TONOMY_BOARD_PUBLIC_KEYS ||
            !Array.isArray(JSON.parse(process.env.TONOMY_BOARD_PUBLIC_KEYS).keys)
        )
            throw new Error('Missing TONOMY_BOARD_PUBLIC_KEYS');
        if (!process.env.TONOMY_TEST_ACCOUNTS_PASSPHRASE) throw new Error('Missing TONOMY_TEST_ACCOUNTS_PASSPHRASE');

        const newPrivateKey = PrivateKey.from(process.env.TONOMY_OPS_PRIVATE_KEY);
        const newPublicKey = newPrivateKey.toPublic();
        const newSigner = EosioUtil.createSigner(newPrivateKey);
        const tonomyGovKeys: string[] = JSON.parse(process.env.TONOMY_BOARD_PUBLIC_KEYS).keys;
        const passphrase = process.env.TONOMY_TEST_ACCOUNTS_PASSPHRASE;

        await createAccounts(tonomyGovKeys);
        await setPrivilegedAccounts();
        await deployEosioMsig();
        await createNativeToken();
        await createTokenDistribution();
        await createTonomyContractAndSetResources();
        await createUsers(passphrase);
        await createTonomyApps(newPublicKey, newSigner);
        await configureDemoToken(newSigner);
        await updateAccountControllers(tonomyGovKeys, newPublicKey, newSigner);
        await deployEosioTonomy(newSigner);
        await updateMsigControl(tonomyGovKeys, newSigner);

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error('Bootstrap error', e.message, JSON.stringify(e, null, 2));
        process.exit(1);
    }
}

async function createAccounts(govKeys: string[]) {
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
    await createAntelopeAccount({ account: 'coinsale.tmy' }, signer);
    await createAntelopeAccount({ account: 'ops.tmy' }, signer);

    // opts.tmy should control the following accounts
    await createAntelopeAccount({ account: 'tonomy' }, signer);
    await createAntelopeAccount({ account: 'demo.tmy' }, signer);
    await createAntelopeAccount({ account: 'eosio.msig' }, signer);
    await createAntelopeAccount({ account: 'eosio.token' }, signer);

    console.log('Create accounts for msig control');

    for (let i = 0; i < govKeys.length; i++) {
        console.log('Create account', indexToAccountName(i));
        await createAntelopeAccount({ account: indexToAccountName(i) }, signer);
    }
}

// Account names can only create digits 1-5
function indexToAccountName(index: number): string {
    if (index > 23) throw new Error('Number too large for current algorithm');
    const indexBase5 = (index + 1).toString(5);

    return indexBase5 + '.found.tmy';
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

async function configureDemoToken(newSigner: Signer) {
    await demoTokenContract.create(`1000000000 ${CURRENCY_SYMBOL}`, newSigner);
    await demoTokenContract.issue(`10000 ${CURRENCY_SYMBOL}`, newSigner);
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
    console.log('Create and issue native token');
    await tokenContract.create(`50000000000.0000 ${CURRENCY_SYMBOL}`, signer);
    console.log('Issue native token');
    await tokenContract.issue('eosio.token', `50000000000.0000 ${CURRENCY_SYMBOL}`, signer);
}

async function createTokenDistribution() {
    console.log('Create token distribution');
    const totalSupply = 50000000000.0;
    const allocations = {
        'ecosystm.tmy': 0.3 * totalSupply,
        'team.tmy': 0.15 * totalSupply,
        'coinsale.tmy': 0.15 * totalSupply,
        'ops.tmy': 0.4 * totalSupply,
    };

    for (const [account, amount] of Object.entries(allocations)) {
        await tokenContract.transfer('eosio.token', account, amount.toString() + `.0000 ${CURRENCY_SYMBOL}`, signer);
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

    await tonomyContract.adminSetApp(
        'eosio',
        'System Contract',
        'Antelope blockchain system governance contract',
        getAppUsernameHash('system'),
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio') + '/tonomy-logo1024.png',
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio'),
        signer
    );
    await tonomyContract.adminSetApp(
        'eosio.token',
        'Native Currency',
        'Ecosystem native currency',
        getAppUsernameHash('currency'),
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio.token') + '/tonomy-logo1024.png',
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio.token'),
        signer
    );
    await tonomyContract.adminSetApp(
        'tonomy',
        'Tonomy System',
        'Tonomy system contract',
        getAppUsernameHash('tonomy'),
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'tonomy') + '/tonomy-logo1024.png',
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'tonomy'),
        signer
    );

    console.log('Set Tonomy system contract params and allocate RAM');
    await tonomyContract.setResourceParams(ramPrice, ramAvailable, fee, signer);

    console.log('Allocate RAM to system accounts');
    // See calculation: https://docs.google.com/spreadsheets/d/17cd4wt3oDHp6p7hty9njKsuukTTn9BYJ5z3Ab0N6pMM/edit?pli=1#gid=0&range=D30
    await tonomyContract.buyRam('ops.tmy', 'eosio', bytesToTokens(3750000), signer);
    await tonomyContract.buyRam('ops.tmy', 'eosio.token', bytesToTokens(2400000), signer);
    await tonomyContract.buyRam('ops.tmy', 'tonomy', bytesToTokens(4680000), signer);
}

function getAppUsernameHash(username: string): Checksum256 {
    const fullUername = TonomyUsername.fromUsername(username, AccountType.APP, getSettings().accountSuffix);

    return Checksum256.from(fullUername.usernameHash);
}

function createSubdomainOnOrigin(origin: string, subdomain: string): string {
    const url = new URL(origin);

    return url.protocol + '//' + subdomain + '.' + url.host;
}

async function createUsers(passphrase: string) {
    mockCreateAccount();
    // Google and Apple app store managers needs to have a test user for their review. That is this user.
    await createUser('testuser', passphrase);

    // Create users for the demo website
    await createUser('lovesboost', passphrase);
    await createUser('sweetkristy', passphrase);
    await createUser('cheesecakeophobia', passphrase);
    await createUser('ultimateBeast', passphrase);
    await createUser('tomtom', passphrase);
    await createUser('readingpro', passphrase);
    await createUser('sohappy', passphrase);
    await createUser('reallychel', passphrase);
    await createUser('thedudeabides', passphrase);
    await createUser('4cryingoutloud', passphrase);

    restoreCreateAccountFromMock();
}

async function createTonomyApps(newPublicKey: PublicKey, newSigner: Signer): Promise<void> {
    console.log('Create Tonomy apps');

    const demo = await createApp({
        appName: `${settings.config.ecosystemName} Demo`,
        usernamePrefix: 'demo',
        description: `Demo of ${settings.config.ecosystemName} login and features`,
        origin: settings.config.demoWebsiteOrigin,
        logoUrl: settings.config.demoWebsiteOrigin + '/market.com.png',
        publicKey: newPublicKey,
        signer,
    });

    console.log('Deploy demo contract');
    await deployContract(
        {
            account: demo.accountName,
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/demo.tmy'),
        },
        newSigner
    );

    await createApp({
        appName: `${settings.config.ecosystemName} Website`,
        usernamePrefix: 'tonomy-sso',
        description: `${settings.config.ecosystemName} website to manager your ID and Data`,
        origin: settings.config.ssoWebsiteOrigin,
        logoUrl: settings.config.ssoWebsiteOrigin + '/tonomy-logo1024.png',
        publicKey: newPublicKey,
        signer,
    });

    await createApp({
        appName: `${settings.config.ecosystemName} Website`,
        usernamePrefix: 'tonomy-console',
        description: `${settings.config.ecosystemName} website to manager your ID and Data`,
        origin: settings.config.consoleWebsiteOrigin,
        logoUrl: settings.config.consoleWebsiteOrigin + '/tonomy-logo1024.png',
        publicKey: newPublicKey,
        signer,
    });
}

async function updateAccountControllers(govKeys: string[], newPublicKey: PublicKey, newSigner: Signer) {
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
    await updateControlByAccount('coinsale.tmy', 'gov.tmy', signer);

    // accounts controlled by ops.tmy (contracts that are called by inline actions need eosio.code permission)
    // tonomy account needs to keep operation account to sign transactions
    await updateAccountKey('tonomy', newPublicKey, true);
    await updateControlByAccount('tonomy', 'ops.tmy', newSigner, { addCodePermission: true, replaceActive: false });
    await updateControlByAccount('eosio.token', 'ops.tmy', signer);
    await updateControlByAccount('eosio.msig', 'ops.tmy', signer);
    await updateControlByAccount('demo.tmy', 'ops.tmy', signer);

    // Update the system contract
    await updateControlByAccount('eosio', 'tonomy', signer);

    for (let i = 0; i < govKeys.length; i++) {
        await updateAccountKey(indexToAccountName(i), govKeys[i]);
    }
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
            extraAuthorization: {
                actor: 'tonomy',
                permission: 'active',
            },
        }
    );
}

async function updateMsigControl(govKeys: string[], signer: Signer) {
    console.log('Update found.tmy msig control');

    const govAccounts: string[] = [];

    for (let i = 0; i < govKeys.length; i++) {
        govAccounts.push(indexToAccountName(i));
    }

    await updateControlByAccount('found.tmy', govAccounts, signer, { useTonomyContract: true });
}
