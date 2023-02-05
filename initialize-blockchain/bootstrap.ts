import deployContract from './deploy-contract';
import path from 'path';
import { createAccount, createApp } from './create-account';
import { EosioTokenContract, setSettings } from 'tonomy-id-sdk';
import { signer, publicKey } from './keys';
import bootstrapSettings from './settings';
import settings from '../tests/services/settings';
import { createUser } from '../tests/util/user';

setSettings(settings);
const eosioTokenContract = EosioTokenContract.Instance;

async function main() {
    await createAccount({ account: 'eosio.token' }, signer);
    await deployContract(
        { account: 'eosio.token', contractDir: path.join(__dirname, '../Tonomy-Contracts/contracts/eosio.token') },
        signer
    );
    await eosioTokenContract.create('1000000000 SYS', signer);
    await eosioTokenContract.issue('100000000 SYS', signer);

    await createAccount({ account: 'id.tonomy' }, signer);
    await deployContract(
        { account: 'id.tonomy', contractDir: path.join(__dirname, '../Tonomy-Contracts/contracts/id.tonomy') },
        signer
    );

    await deployContract(
        { account: 'eosio', contractDir: path.join(__dirname, '../Tonomy-Contracts/contracts/eosio.bios.tonomy') },
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
    await createUser('testuser', '1GjGtP%g5UOp2lQ&U5*p');
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
