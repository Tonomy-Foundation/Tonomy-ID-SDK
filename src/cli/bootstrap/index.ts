import deployContract from './deploy-contract';
import path from 'path';
import { fileURLToPath } from 'url';
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
    VestingContract,
} from '../../sdk/index';
import { getSigner, updateAccountKey, updateControlByAccount } from './keys';
import settings from './settings';
import { Checksum256, PrivateKey, PublicKey } from '@wharfkit/antelope';
import { Authority, Signer, TonomyEosioProxyContract, defaultBlockchainParams } from '../../sdk/services/blockchain';
import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';

setSettings(settings.config);

const demoTokenContract = DemoTokenContract.Instance;
const tokenContract = EosioTokenContract.Instance;
const tonomyContract = TonomyContract.Instance;
const eosioContract = EosioContract.Instance;
const vestingContract = VestingContract.Instance;

const ramPrice = 173333.3333; // bytes/token
const fee = 0.25 / 100; // 0.25%
const ramAvailable = 8 * 1024 * 1024 * 1024; // 8 GB

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Converts bytes to tokens.
 *
 * @param bytes The number of bytes to convert.
 * @returns The converted value in tokens.
 */
function bytesToTokens(bytes: number): string {
    return ((bytes * (1 + fee)) / ramPrice).toFixed(6) + ` ${getSettings().currencySymbol}`;
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
        await setBlockchainParameters();
        await deployEosioMsig();
        await deployVesting();
        await createNativeToken();
        await createTokenDistribution();
        await createTonomyContractAndSetResources();
        await createUsers(passphrase);
        await createTonomyApps(newPublicKey, newSigner);
        await configureDemoToken(newSigner);
        await updateAccountControllers(tonomyGovKeys, newPublicKey);
        await deployEosioTonomy(newSigner);
        await updateMsigControl(tonomyGovKeys, newSigner);

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error('Bootstrap error', e.message, JSON.stringify(e, null, 2));
        process.exit(1);
    }
}

const foundControlledAccounts = ['gov.tmy', 'team.tmy', 'prod1.tmy', 'prod2.tmy', 'prod3.tmy'];
const govControlledAccounts = ['ops.tmy'];
const operationsAccount = 'ops.tmy';

export const opsControlledAccounts = [
    'tonomy',
    'ecosystm.tmy',
    'coinsale.tmy',
    'eosio.token',
    'eosio.msig',
    'demo.tmy',
    'vesting.tmy',
    'legal.tmy',
    'reserves.tmy',
    'partners.tmy',
    'liquidty.tmy',
    'marketng.tmy',
    'infra.tmy',
];

const systemAccount = 'eosio';

async function createAccounts(govKeys: string[]) {
    console.log('Create accounts');
    await createAntelopeAccount({ account: 'found.tmy' }, signer);

    // found.tmy should control the following accounts
    for (const account of foundControlledAccounts) {
        await createAntelopeAccount({ account }, signer);
    }

    // gov.tmy should control the following accounts
    for (const account of govControlledAccounts) {
        await createAntelopeAccount({ account }, signer);
    }

    // opts.tmy should control the following accounts
    for (const account of opsControlledAccounts) {
        await createAntelopeAccount({ account }, signer);
    }

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
    console.log('Set privileged accounts');
    await eosioContract.setPriv('tonomy', 1, signer);
    await eosioContract.setPriv('eosio.msig', 1, signer);
}

async function setBlockchainParameters() {
    console.log('Set blockchain parameters');
    await eosioContract.setParams(defaultBlockchainParams, signer);
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
    await demoTokenContract.create(`1000000000 DEMO`, newSigner);
    await demoTokenContract.issue(`10000 DEMO`, newSigner);
}

async function deployVesting() {
    console.log('Deploy vesting.tmy contract');
    await deployContract(
        {
            account: 'vesting.tmy',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/vesting.tmy'),
        },
        signer
    );
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
    await tokenContract.create(`50000000000.000000 ${getSettings().currencySymbol}`, signer);
    console.log('Issue native token');
    await tokenContract.issue('eosio.token', `50000000000.000000 ${getSettings().currencySymbol}`, signer);
}

const allocations: [string, number][] = [
    ['coinsale.tmy', 0.025], // Seed Private Sale
    ['coinsale.tmy', 0.055], // Strategic Partners Private Sale
    ['coinsale.tmy', 0.07], // Public Sale
    ['team.tmy', 0.15], // Team and Advisors
    ['legal.tmy', 0.02], // Legal and Compliance
    ['reserves.tmy', 0.03], // Reserves
    ['partners.tmy', 0.05], // Partnerships
    ['liquidty.tmy', 0.05], // Liquidity Allocation
    ['marketng.tmy', 0.1], // Community and Marketing
    ['ops.tmy', 0.05], // Platform Operations
    ['infra.tmy', 0.1], // Infrastructure Rewards
    ['ecosystm.tmy', 0.3], // Ecosystem
];

export const addCodePermissionTo = allocations.map((allocation) => allocation[0]);

async function createTokenDistribution() {
    console.log('Create token distribution');
    const totalSupply = 50000000000.0;

    let totalPercentage = 0;

    for (const allocation of allocations) {
        const account = allocation[0];
        const percentage = allocation[1];

        totalPercentage += percentage;
        console.log(
            'Allocate',
            ((percentage * 100).toFixed(1) + '% to').padStart(8),
            account.padEnd(13),
            (percentage * totalSupply).toFixed(0) + `.000000 ${getSettings().currencySymbol}`
        );
        await tokenContract.transfer(
            'eosio.token',
            account,
            (percentage * totalSupply).toFixed(0) + `.000000 ${getSettings().currencySymbol}`,
            signer
        );
    }

    if (totalPercentage.toFixed(4) !== '1.0000') {
        throw new Error('Total percentage should be 100% but it is ' + totalPercentage.toFixed(4));
    }

    await vestingContract.setSettings('2024-04-30T12:00:00', '2030-01-01T00:00:00', signer);
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
        systemAccount,
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
    await tonomyContract.adminSetApp(
        'vesting.tmy',
        'LEOS Vesting',
        'LEOS Vesting contract',
        getAppUsernameHash('vesting'),
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'vesting') + '/tonomy-logo1024.png',
        createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'vesting'),
        signer
    );

    console.log('Set Tonomy system contract params and allocate RAM');
    await tonomyContract.setResourceParams(ramPrice, ramAvailable, fee, signer);

    console.log('Allocate operational tokens to accounts');
    await tokenContract.transfer('ops.tmy', 'tonomy', bytesToTokens(3750000), signer);

    console.log('Allocate RAM to system accounts');
    // See calculation: https://docs.google.com/spreadsheets/d/17cd4wt3oDHp6p7hty9njKsuukTTn9BYJ5z3Ab0N6pMM/edit?pli=1#gid=0&range=D30
    const ramAllocations: [string, number][] = [
        [systemAccount, 3750000],
        ['eosio.token', 2400000],
        ['tonomy', 4680000],
        ['vesting.tmy', 4680000],
    ];

    for (const allocation of ramAllocations) {
        const account = allocation[0];
        const tokens = bytesToTokens(allocation[1]);

        await tokenContract.transfer('ops.tmy', account, tokens, signer);
        await tonomyContract.buyRam('ops.tmy', account, tokens, signer);
    }
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
        appName: 'Developers Console',
        usernamePrefix: 'developer-console',
        description: `Developer console to manage ${settings.config.ecosystemName} applications and infrastucture`,
        origin: settings.config.consoleWebsiteOrigin,
        logoUrl: settings.config.consoleWebsiteOrigin + '/tonomy-logo1024.png',
        publicKey: newPublicKey,
        signer,
    });
}

async function updateAccountControllers(govKeys: string[], newPublicKey: PublicKey) {
    console.log('Change the key of the accounts to the new key', newPublicKey.toString());
    await updateAccountKey('found.tmy', newPublicKey);

    function updateControlByOptions(account: string) {
        return { addCodePermission: addCodePermissionTo.includes(account) ? 'vesting.tmy' : undefined };
    }

    // accounts controlled by found.tmy
    for (const account of foundControlledAccounts) {
        await updateControlByAccount(account, 'found.tmy', signer, updateControlByOptions(account));
    }

    // ops.tmy account controlled by gov.tmy
    const activeAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'active' });
    const ownerAuthority = Authority.fromAccount({ actor: 'gov.tmy', permission: 'owner' });

    activeAuthority.addKey(newPublicKey.toString(), 1);
    activeAuthority.addCodePermission('vesting.tmy');
    await eosioContract.updateauth(operationsAccount, 'active', 'owner', activeAuthority, signer);
    await eosioContract.updateauth(operationsAccount, 'owner', 'owner', ownerAuthority, signer);

    // accounts controlled by ops.tmy
    for (const account of opsControlledAccounts.filter(
        (account) => account !== 'vesting.tmy' && account !== 'tonomy'
    )) {
        await updateControlByAccount(account, 'ops.tmy', signer, updateControlByOptions(account));
    }

    // (contracts that are called by inline actions need eosio.code permission)
    await updateControlByAccount('vesting.tmy', 'ops.tmy', signer, { addCodePermission: 'vesting.tmy' });
    await updateControlByAccount('tonomy', 'ops.tmy', signer, { addCodePermission: 'tonomy' });

    // Update the system contract
    await updateControlByAccount(systemAccount, 'tonomy', signer);

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

const tonomyEosioProxyContract = TonomyEosioProxyContract.Instance;

async function updateMsigControl(govKeys: string[], signer: Signer) {
    console.log('Update found.tmy msig control');

    const govAccounts: string[] = govKeys.map((key) => indexToAccountName(govKeys.indexOf(key)));

    const activeAuthority = Authority.fromAccount({ actor: 'found.tmy', permission: 'owner' });
    const threshold = Math.ceil((govAccounts.length * 2) / 3);
    const ownerAuthority = Authority.fromAccountArray(govAccounts, 'active', threshold);

    await tonomyEosioProxyContract.updateauth('found.tmy', 'active', 'owner', activeAuthority, signer);

    await tonomyEosioProxyContract.updateauth('found.tmy', 'owner', 'owner', ownerAuthority, signer);
}
