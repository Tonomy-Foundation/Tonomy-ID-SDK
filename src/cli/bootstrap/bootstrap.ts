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
        await eosioTokenContract.issue('100000000 SYS', signer);

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

        await createApp({
            appName: 'Market',
            usernamePrefix: 'market',
            description: 'market.com where you can buy and sell stuff ',
            origin: bootstrapSettings.config.demoWebsiteOrigin,
            logoUrl: bootstrapSettings.config.demoWebsiteLogoUrl,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            publicKey: publicKey as any,
        });

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
        const password = '1GjGtP%g5UOp2lQ&U5*p';
        const { user } = await createUser('testuser', password);
        const username = await user.getUsername();

        console.log(`Created user with`);
        console.log(`  username:    ${username.username}`);
        console.log(`  usernamHash: ${username.usernameHash}`);
        console.log(`  password:    ${password}`);
        console.log('Bootstrap complete');
    } catch (e: any) {
        console.error(e);
        process.exit(1);
    }
}
