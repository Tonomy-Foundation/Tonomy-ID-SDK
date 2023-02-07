import deployContract from './deploy-contract';
import path from 'path';
import { createAccount, createApp } from './create-account';
import { EosioTokenContract, setSettings } from '../src/index';
import { signer, publicKey } from './keys';
import bootstrapSettings from './settings';
import settings from '../test-integration/services/settings';
import { createUser } from '../test-integration/util/user';

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
    return;
}

Promise.resolve(main()).catch((err) => {
    // this is to ignore websockets errors
    if (err.message.includes('websocket')) {
        return;
    }

    console.error(err);
    process.exit(1);
});
