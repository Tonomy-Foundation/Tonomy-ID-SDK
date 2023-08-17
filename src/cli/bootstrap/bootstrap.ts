import deployContract from './deploy-contract';
import path from 'path';
import { createAntelopeAccount, createApp } from './create-account';
import { EosioTokenContract, setSettings } from '../../sdk/index';
import { signer, publicKey, updateAccountKey } from './keys';
import bootstrapSettings from './settings';
import settings from './settings';
import { createUser, mockCreateAccount, restoreCreateAccountFromMock } from './user';

setSettings(settings.config);

const eosioTokenContract = EosioTokenContract.Instance;

export default async function bootstrap(args: string[]) {
    const newPublicKey = args[0];

    if (!newPublicKey) throw new Error('Missing public key argument');

    try {
        await createAntelopeAccount({ account: 'eosio.token' }, signer);
        await deployContract(
            {
                account: 'eosio.token',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.token'),
            },
            signer
        );
        await eosioTokenContract.create('1000000000 SYS', signer);
        await eosioTokenContract.issue('10000 SYS', signer);

        await createAntelopeAccount({ account: 'id.tonomy' }, signer);
        await deployContract(
            { account: 'id.tonomy', contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/id.tonomy') },
            signer
        );

        const demo = await createApp({
            appName: 'Tonomy Demo',
            usernamePrefix: 'demo',
            description: 'Demo of Tonomy ID login and features',
            origin: bootstrapSettings.config.demoWebsiteOrigin,
            logoUrl: bootstrapSettings.config.demoWebsiteLogoUrl,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            publicKey: publicKey as any,
        });

        // action to add demo permission to token contract
        console.log('Adding demo permission to token contract');
        eosioTokenContract.addPerm(demo.accountName, signer);

        await createApp({
            appName: 'Tonomy Website',
            usernamePrefix: 'tonomy',
            description: 'Tonomy website to manager your ID and Data',
            origin: bootstrapSettings.config.ssoWebsiteOrigin,
            logoUrl: bootstrapSettings.config.ssoWebsiteLogoUrl,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            publicKey: publicKey as any,
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

        console.log('Change the key of the accounts to the new key');
        await updateAccountKey('id.tonomy', 'PUB_K1_66F4SKg8F9jXSqtDrjyHWKC2tCjcvPrvqLoYGuvVaTsKtTGXRj', true);
        await updateAccountKey('eosio.token', 'PUB_K1_66F4SKg8F9jXSqtDrjyHWKC2tCjcvPrvqLoYGuvVaTsKtTGXRj', true);
        // updateAccountKey('eosio', newPublicKey);

        console.log('Deploy Tonomy bios contract, which limits access to system actions');
        await deployContract(
            {
                account: 'eosio',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.bios.tonomy'),
            },
            signer
        );

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error(e);
        if (e.error?.details) console.log(e.error.details);
        process.exit(1);
    }
}
