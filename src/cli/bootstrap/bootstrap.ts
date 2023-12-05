import deployContract from './deploy-contract';
import path from 'path';
import { createAntelopeAccount, createApp } from './create-account';
import { DemoTokenContract, EosioUtil, setSettings, OnoCoinContract } from '../../sdk/index';
import { signer, updateAccountKey, updateControllByAccount } from './keys';
import settings from './settings';
import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';
import { PrivateKey } from '@wharfkit/antelope';

setSettings(settings.config);

const demoTokenContract = DemoTokenContract.Instance;
const onoCoinContract = OnoCoinContract.Instance;

export default async function bootstrap(args: string[]) {
    if (!args[0]) throw new Error('Missing public key argument');

    const newPrivateKey = PrivateKey.from(args[0]);
    const newPublicKey = newPrivateKey.toPublic();

    try {
        await createAntelopeAccount({ account: 'demo.tmy' }, signer);
        await deployContract(
            {
                account: 'demo.tmy',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/demo.tmy'),
            },
            signer
        );
        await demoTokenContract.create('1000000000 SYS', signer);
        await demoTokenContract.issue('10000 SYS', signer);

        await createAntelopeAccount({ account: 'onocoin.tmy' }, signer);
        await deployContract(
            {
                account: 'onocoin.tmy',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/onocoin.tmy'),
            },
            signer
        );
        await onoCoinContract.create('50000000000.0000 ONO', signer);
        await onoCoinContract.issue('onocoin.tmy', '32500000000.0000 ONO', signer);

        await createAntelopeAccount({ account: 'id.tmy' }, signer);
        await deployContract(
            { account: 'id.tmy', contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/id.tmy') },
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
        await createAntelopeAccount({ account: 'opration.tmy' }, signer);
        const totalSupply = 50000000000.0;
        //token allocations
        const teamAllocation = totalSupply * 0.15;
        const ecosystemAllocation = totalSupply * 0.3;
        const privateAllocation = totalSupply * 0.025;
        const publicAllocation = totalSupply * 0.025;
        const operationAllocation = totalSupply * 0.4;

        await onoCoinContract.transfer('onocoin.tmy', 'team.tmy', teamAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'ecosystm.tmy', ecosystemAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'private1.tmy', privateAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'private2.tmy', privateAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'private3.tmy', privateAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'public1.tmy', publicAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'public2.tmy', publicAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'public3.tmy', publicAllocation.toString() + ' ONO', signer);
        await onoCoinContract.transfer('onocoin.tmy', 'opration.tmy', operationAllocation.toString() + ' ONO', signer);

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
        await updateControllByAccount('gov.tmy', 'found.tmy', true);
        await updateControllByAccount('team.tmy', 'found.tmy');
        await updateControllByAccount('prod1.tmy', 'found.tmy');
        await updateControllByAccount('prod2.tmy', 'found.tmy');
        await updateControllByAccount('prod3.tmy', 'found.tmy');
        //accounts controlled by gov.tmy
        await updateControllByAccount('id.tmy', 'gov.tmy', true);
        await updateControllByAccount('eosio', 'gov.tmy');
        await updateControllByAccount('demo.tmy', 'gov.tmy');
        await updateControllByAccount('onocoin.tmy', 'gov.tmy');
        await updateControllByAccount('ecosystm.tmy', 'gov.tmy');
        await updateControllByAccount('private1.tmy', 'gov.tmy');
        await updateControllByAccount('private2.tmy', 'gov.tmy');
        await updateControllByAccount('private3.tmy', 'gov.tmy');
        await updateControllByAccount('public1.tmy', 'gov.tmy');
        await updateControllByAccount('public2.tmy', 'gov.tmy');
        await updateControllByAccount('public3.tmy', 'gov.tmy');
        await updateControllByAccount('opration.tmy', 'gov.tmy');

        // TODO change the block signing key as well

        console.log('Deploy Tonomy bios contract, which limits access to system actions');
        await deployContract(
            {
                account: 'eosio',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.bios.tonomy'),
            },
            EosioUtil.createSigner(newPrivateKey)
        );

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error(e);
        if (e.error?.details) console.log(e.error.details);
        process.exit(1);
    }
}
