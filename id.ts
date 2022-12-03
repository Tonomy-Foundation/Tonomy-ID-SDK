import { Name, PrivateKey, PublicKey } from '@greymass/eosio';
import { IDContract } from './src/services/contracts/IDContract';
import { createSigner } from './src/services/eosio/transaction';
import { setSettings } from './src/settings';
import { AccountType, TonomyUsername } from './src/services/username';

const args: string[] = process.argv.slice(2);

const idContract = IDContract.Instance;
const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');

async function main() {
    console.log('Creating new app');
    console.log('Arguments: ', args);

    const name = args[0];
    const username = new TonomyUsername(args[1], AccountType.APP, '.test.id');
    const usernameHash = username.usernameHash;
    const description = args[2];
    const logo_url = args[3];
    const domain = args[4];
    const public_key = PublicKey.from(args[5]);

    const blockchainUrl = args[6];
    setSettings({
        blockchainUrl,
    });

    const res = await idContract.newapp(
        name,
        usernameHash,
        description,
        logo_url,
        domain,
        public_key,
        createSigner(privateKey)
    );
    const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
    const accountName = Name.from(newAccountAction.data.name);

    console.log('New app created with username: ', username.username);
    console.log('and account name: ', accountName.toString());
}

Promise.resolve(main()).catch((err) => {
    console.error(err);
    process.exit(1);
});
