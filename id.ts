import { PublicKey } from '@greymass/eosio';
import { setSettings } from './src/settings';
import { App, AppCreateOptions } from './src/app';

const args: string[] = process.argv.slice(2);

async function main() {
    console.log('Creating new app');
    console.log('Arguments: ', args);

    const options: AppCreateOptions = {
        appName: args[0],
        usernamePrefix: args[1],
        description: args[2],
        logoUrl: args[3],
        origin: args[4],
        publicKey: PublicKey.from(args[5]),
    };

    const res = await App.create(options);

    const blockchainUrl = args[6];
    setSettings({
        blockchainUrl,
    });

    console.log('New app created with username: ', res.username.username);
    console.log('and account name: ', res.accountName.toString());
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
