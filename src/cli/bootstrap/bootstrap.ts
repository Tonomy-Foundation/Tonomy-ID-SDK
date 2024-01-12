import deployContract from './deploy-contract';
import path from 'path';
import { createAntelopeAccount, createApp } from './create-account';
import {
    DemoTokenContract,
    EosioUtil,
    setSettings,
    EosioTokenContract,
    EosioContract,
    AccountTypeEnum,
} from '../../sdk/index';
import { signer, updateAccountKey, updateControlByAccount } from './keys';
import settings from './settings';
import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';
import { PrivateKey } from '@wharfkit/antelope';

setSettings(settings.config);

const demoTokenContract = DemoTokenContract.Instance;
const tokenContract = EosioTokenContract.Instance;
const eosioContract = EosioContract.Instance;
const ramPrice = 173333.3333; // bytes/token
const fee = 0.25 / 100; // 0.25%
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

    const newPrivateKey = PrivateKey.from(args[0]);
    const newPublicKey = newPrivateKey.toPublic();
    const newSigner = EosioUtil.createSigner(newPrivateKey);

    try {
        console.log('Create and deploy demo contract');
        await createAntelopeAccount({ account: 'demo.tmy' }, signer);
        await deployContract(
            {
                account: 'demo.tmy',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/demo.tmy'),
            },
            signer
        );
        await demoTokenContract.create(`1000000000 ${currencySymbol}`, signer);
        await demoTokenContract.issue(`10000 ${currencySymbol}`, signer);

        console.log('Create and deploy token contract');
        await createAntelopeAccount({ account: 'eosio.token' }, signer);
        await deployContract(
            {
                account: 'eosio.token',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.token'),
            },
            signer
        );
        await tokenContract.create(`50000000000.0000 ${currencySymbol}`, signer);
        await tokenContract.issue('eosio.token', `50000000000.0000 ${currencySymbol}`, signer);

        console.log('Deploy Tonomy system contract');
        await deployContract(
            {
                account: 'eosio',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.tonomy'),
            },
            signer
        );

        await createAntelopeAccount({ account: 'found.tmy' }, signer);
        // found.tmy should be controlled by the following accounts
        await createAntelopeAccount({ account: 'gov.tmy' }, signer);
        await createAntelopeAccount({ account: 'team.tmy' }, signer);
        await createAntelopeAccount({ account: 'prod1.tmy' }, signer);
        await createAntelopeAccount({ account: 'prod2.tmy' }, signer);
        await createAntelopeAccount({ account: 'prod3.tmy' }, signer);
        // gov.tmy should be controlled by the following accounts
        await createAntelopeAccount({ account: 'ecosystm.tmy' }, signer);
        await createAntelopeAccount({ account: 'private1.tmy' }, signer);
        await createAntelopeAccount({ account: 'private2.tmy' }, signer);
        await createAntelopeAccount({ account: 'private3.tmy' }, signer);
        await createAntelopeAccount({ account: 'public1.tmy' }, signer);
        await createAntelopeAccount({ account: 'public2.tmy' }, signer);
        await createAntelopeAccount({ account: 'public3.tmy' }, signer);
        await createAntelopeAccount({ account: 'ops.tmy' }, signer);
        const totalSupply = 50000000000.0;
        //token allocations to all categories
        const teamAllocation = totalSupply * 0.15;
        const ecosystemAllocation = totalSupply * 0.3;
        const privateAllocation = totalSupply * 0.025;
        const publicAllocation = totalSupply * 0.025;
        const operationAllocation = totalSupply * 0.4;

        await tokenContract.transfer(
            'eosio.token',
            'team.tmy',
            teamAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'ecosystm.tmy',
            ecosystemAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'private1.tmy',
            privateAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'private2.tmy',
            privateAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'private3.tmy',
            privateAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'public1.tmy',
            publicAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'public2.tmy',
            publicAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'public3.tmy',
            publicAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );
        await tokenContract.transfer(
            'eosio.token',
            'ops.tmy',
            operationAllocation.toString() + `.0000 ${currencySymbol}`,
            signer
        );

        const demo = await createApp({
            appName: 'Tonomy Demo',
            usernamePrefix: 'demo',
            description: 'Demo of Tonomy ID login and features',
            origin: settings.config.demoWebsiteOrigin,
            logoUrl: settings.config.demoWebsiteOrigin + '/market.com.png',
            publicKey: newPublicKey,
        });

        // action to add demo permission to token contract
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

        console.log('Change the key of the accounts to the new key', newPublicKey.toString());
        await updateAccountKey('found.tmy', newPublicKey, true);
        // accounts controlled by found.tmy
        await updateControlByAccount('gov.tmy', 'found.tmy', signer, true);
        await updateControlByAccount('team.tmy', 'found.tmy', signer);
        await updateControlByAccount('prod1.tmy', 'found.tmy', signer);
        await updateControlByAccount('prod2.tmy', 'found.tmy', signer);
        await updateControlByAccount('prod3.tmy', 'found.tmy', signer);
        //accounts controlled by gov.tmy
        await updateControlByAccount('ops.tmy', 'gov.tmy', signer);
        await updateControlByAccount('eosio', 'ops.tmy', signer); //need ram
        await updateControlByAccount('demo.tmy', 'gov.tmy', signer);
        await updateControlByAccount('eosio.token', 'ops.tmy', signer); //need ram
        await updateControlByAccount('ecosystm.tmy', 'gov.tmy', signer);
        await updateControlByAccount('private1.tmy', 'gov.tmy', signer);
        await updateControlByAccount('private2.tmy', 'gov.tmy', signer);
        await updateControlByAccount('private3.tmy', 'gov.tmy', signer);
        await updateControlByAccount('public1.tmy', 'gov.tmy', signer);
        await updateControlByAccount('public2.tmy', 'gov.tmy', signer);
        await updateControlByAccount('public3.tmy', 'gov.tmy', signer);

        await eosioContract.setAccountType('eosio', AccountTypeEnum.App, newSigner);
        await eosioContract.setAccountType('eosio.token', AccountTypeEnum.App, newSigner);

        // Call setresparams() to set the initial RAM price
        await eosioContract.setresparams(ramPrice, 8 * 1024 * 1024 * 1024, fee, newSigner);

        await eosioContract.buyRam('ops.tmy', 'eosio', bytesToTokens(4680000), newSigner);
        await eosioContract.buyRam('ops.tmy', 'eosio.token', bytesToTokens(2400000), newSigner);

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error('error', e);
        if (e.error?.details) console.log('error detail', e.error.details[0]);
        process.exit(1);
    }
}
