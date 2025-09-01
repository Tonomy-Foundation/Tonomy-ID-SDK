import deployContract from './deploy-contract';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAntelopeAccount, createApp } from './create-account';
import {
    DemoTokenContract,
    EosioTokenContract,
    EosioContract,
    getTonomyContract,
    EosioUtil,
    TonomyUsername,
    AccountType,
    getSettings,
    VestingContract,
} from '../../sdk/index';
import { getSigner, updateAccountKey, updateControlByAccount } from './keys';
import settings from '../settings';
import { Checksum256, PrivateKey, PublicKey } from '@wharfkit/antelope';
import {
    Authority,
    Signer,
    TonomyEosioProxyContract,
    bytesToTokens,
    defaultBlockchainParams,
    TOTAL_RAM_AVAILABLE,
    RAM_FEE,
    RAM_PRICE,
    StakingContract,
    amountToAsset,
} from '../../sdk/services/blockchain';
import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';
import { sleep } from '../../sdk/util';

const demoTokenContract = DemoTokenContract.Instance;
const tokenContract = EosioTokenContract.Instance;
const eosioContract = EosioContract.Instance;
const vestingContract = VestingContract.Instance;
const stakeContract = StakingContract.Instance;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        await deployStaking();
        await createNativeToken();
        await createTokenDistribution();
        await createTonomyContractAndSetResources();
        await createUsers(passphrase);
        await createTonomyApps(newPublicKey, newSigner);
        await configureDemoToken(newSigner);
        await updateAccountControllers(tonomyGovKeys, newPublicKey);
        await setupVestingAndStaking(newSigner);
        await deployEosioTonomy(newSigner);
        await updateMsigControl(tonomyGovKeys, newSigner);

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error('Bootstrap error', e.message, JSON.stringify(e, null, 2));
        process.exit(1);
    }
}

export const foundAccount = 'found.tmy';
export const foundControlledAccounts = ['gov.tmy', 'team.tmy', 'prod1.tmy', 'prod2.tmy', 'prod3.tmy'];
export const govControlledAccounts = ['ops.tmy'];
export const operationsAccount = 'ops.tmy';

export const opsControlledAccounts = [
    'tonomy',
    'ecosystm.tmy',
    'coinsale.tmy',
    'eosio.token',
    'eosio.msig',
    'demo.tmy',
    'vesting.tmy',
    'staking.tmy',
    'legal.tmy',
    'reserves.tmy',
    'partners.tmy',
    'liquidty.tmy',
    'marketng.tmy',
    'infra.tmy',
];

export const systemAccount = 'eosio';

async function createAccounts(govKeys: string[]) {
    console.log('Create accounts');
    await createAntelopeAccount({ account: foundAccount }, signer);

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

async function deployStaking() {
    console.log('Deploy staking.tmy contract');
    await deployContract(
        {
            account: 'staking.tmy',
            contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/staking.tmy'),
        },
        signer
    );
}

async function setupVestingAndStaking(newSigner: Signer) {
    await vestingContract.setSettings(VestingContract.SALE_START_DATE, VestingContract.VESTING_START_DATE, newSigner);

    await stakeContract.setSettings(amountToAsset(StakingContract.yearlyStakePool, 'TONO'), newSigner);
    await sleep(1000);
    await stakeContract.addYield('infra.tmy', amountToAsset(StakingContract.yearlyStakePool / 2, 'TONO'), newSigner); // 6 months budget in the account
    console.log('Staking settings', await stakeContract.getSettings());
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

    let totalPercentage = 0;

    for (const allocation of allocations) {
        const account = allocation[0];
        const percentage = allocation[1];

        totalPercentage += percentage;
        console.log(
            'Allocate',
            ((percentage * 100).toFixed(1) + '% to').padStart(8),
            account.padEnd(13),
            (percentage * EosioTokenContract.TOTAL_SUPPLY).toFixed(0) + `.000000 ${getSettings().currencySymbol}`
        );
        await tokenContract.transfer(
            'eosio.token',
            account,
            (percentage * EosioTokenContract.TOTAL_SUPPLY).toFixed(0) + `.000000 ${getSettings().currencySymbol}`,
            'Initial allocation',
            signer
        );
    }

    if (totalPercentage.toFixed(4) !== '1.0000') {
        throw new Error('Total percentage should be 100% but it is ' + totalPercentage.toFixed(4));
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

    const apps = [
        {
            accountName: systemAccount,
            appName: 'System Contract',
            description: 'Antelope blockchain system governance contract',
            usernameHash: getAppUsernameHash('system'),
            logoUrl: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio') + '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio'),
            backgroundColor: '#251950',
            accentColor: '#BA54D3',
            ramAllocation: 3750000, // 3.75MB
        },
        {
            accountName: 'eosio.token',
            appName: 'Native Currency',
            description: 'Ecosystem native currency',
            usernameHash: getAppUsernameHash('currency'),
            logoUrl: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio.token') + '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'eosio.token'),
            backgroundColor: '#251950',
            accentColor: '#BA54D3',
            ramAllocation: 2400000, // 2.4MB
        },
        {
            accountName: 'tonomy',
            appName: 'Tonomy System',
            description: 'Tonomy system contract',
            usernameHash: getAppUsernameHash('tonomy'),
            logoUrl: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'tonomy') + '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'tonomy'),
            backgroundColor: '#251950',
            accentColor: '#BA54D3',
            ramAllocation: 4680000, // 4.68MB
        },
        {
            accountName: 'vesting.tmy',
            appName: 'TONO Vesting',
            description: 'TONO Vesting contract',
            usernameHash: getAppUsernameHash('vesting'),
            logoUrl: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'vesting') + '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'vesting'),
            backgroundColor: '#251950',
            accentColor: '#BA54D3',
            ramAllocation: 4680000, // 4.68MB
        },
        {
            accountName: 'staking.tmy',
            appName: 'TONO Staking',
            description: 'TONO Staking contract',
            usernameHash: getAppUsernameHash('staking'),
            logoUrl: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'staking') + '/tonomy-logo1024.png',
            origin: createSubdomainOnOrigin(getSettings().ssoWebsiteOrigin, 'staking'),
            backgroundColor: '#251950',
            accentColor: '#BA54D3',
            ramAllocation: 4680000, // 4.68MB
        },
    ];

    for (const app of apps) {
        await getTonomyContract().adminSetApp(
            app.accountName,
            app.appName,
            app.description,
            app.usernameHash,
            app.logoUrl,
            app.origin,
            app.backgroundColor,
            app.accentColor,
            signer
        );
    }

    console.log('Set Tonomy system contract params and allocate RAM');
    console.log('Set resource params', RAM_PRICE, TOTAL_RAM_AVAILABLE, RAM_FEE);
    await getTonomyContract().setResourceParams(RAM_PRICE, TOTAL_RAM_AVAILABLE, RAM_FEE, signer);

    console.log('Allocate operational tokens to accounts');
    await tokenContract.transfer('ops.tmy', 'tonomy', bytesToTokens(3750000), 'Initial allocation', signer);

    console.log('Allocate RAM to system accounts');

    // See calculation: https://docs.google.com/spreadsheets/d/17cd4wt3oDHp6p7hty9njKsuukTTn9BYJ5z3Ab0N6pMM/edit?pli=1#gid=0&range=D30
    for (const app of apps) {
        const account = app.accountName;
        const tokens = bytesToTokens(app.ramAllocation);

        console.log(`Buying ${app.ramAllocation / 1000}KB of RAM for ${account} for ${tokens}`);

        await tokenContract.transfer('ops.tmy', account, tokens, 'Initial allocation', signer);
        await getTonomyContract().buyRam('ops.tmy', account, tokens, signer);
    }
}

export function getAppUsernameHash(username: string): Checksum256 {
    const fullUername = TonomyUsername.fromUsername(username, AccountType.APP, getSettings().accountSuffix);

    return Checksum256.from(fullUername.usernameHash);
}

export function createSubdomainOnOrigin(origin: string, subdomain: string): string {
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
        backgroundColor: '#251950',
        accentColor: '#BA54D3',
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
        backgroundColor: '#251950',
        accentColor: '#BA54D3',
        publicKey: newPublicKey,
        signer,
    });

    await createApp({
        appName: 'Developers Console',
        usernamePrefix: 'developer-console',
        description: `Developer console to manage ${settings.config.ecosystemName} applications and infrastucture`,
        origin: settings.config.consoleWebsiteOrigin,
        logoUrl: settings.config.consoleWebsiteOrigin + '/tonomy-logo1024.png',
        backgroundColor: '#251950',
        accentColor: '#BA54D3',
        publicKey: newPublicKey,
        signer,
    });

    await createApp({
        appName: 'Tonomy',
        usernamePrefix: 'tonomy',
        description: `Access all your Tonomy apps in one hub. Manage tokens, explore the blockchain, create, collaborate, and build — it’s all at your fingertips`,
        origin: settings.config.tonomyAppsOrigin,
        logoUrl: settings.config.tonomyAppsOrigin + '/market.com.png',
        backgroundColor: '#F9FAFB',
        accentColor: '#5833BC',
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
        (account) => !['vesting.tmy', 'staking.tmy', 'tonomy'].includes(account)
    )) {
        if (account === 'infra.tmy') {
            // infra.tmy also have be able to call staking.tmy::addyield() which transfers tokens
            await updateControlByAccount(account, 'ops.tmy', signer, {
                addCodePermission: ['vesting.tmy', 'staking.tmy'],
            });
        } else {
            await updateControlByAccount(account, 'ops.tmy', signer, updateControlByOptions(account));
        }
    }

    // (contracts that are called by inline actions need eosio.code permission)
    await updateControlByAccount('vesting.tmy', 'ops.tmy', signer, { addCodePermission: 'vesting.tmy' });
    await updateControlByAccount('staking.tmy', 'ops.tmy', signer, { addCodePermission: 'staking.tmy' });
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
