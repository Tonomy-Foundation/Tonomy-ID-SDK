import deployContract from './deploy-contract';
import path from 'path';
import { createAccount, createApp } from './create-account';
import { EosioTokenContract, setSettings } from '../../sdk/index';
import { signer, publicKey } from './keys';
import bootstrapSettings from './settings';
import settings from './settings';
import { createUser } from './user';

setSettings(settings.config);
const eosioTokenContract = EosioTokenContract.Instance;

export default async function bootstrap() {
    try {
        await createAccount({ account: 'eosio.token' }, signer);
        await deployContract(
            {
                account: 'eosio.token',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.token'),
            },
            signer
        );
        await eosioTokenContract.create('1000000000 SYS', signer);
        await eosioTokenContract.issue('10000 SYS', signer);

        await createAccount({ account: 'id.tonomy' }, signer);
        await deployContract(
            { account: 'id.tonomy', contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/id.tonomy') },
            signer
        );

        await deployContract(
            {
                account: 'eosio',
                contractDir: path.join(__dirname, '../../Tonomy-Contracts/contracts/eosio.bios.tonomy'),
            },
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

        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error(e);
        if (e.error?.details) console.log(e.error.details);
        process.exit(1);
    }
}
