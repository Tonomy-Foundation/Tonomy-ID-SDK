import { PublicKey } from '@wharfkit/antelope';
import { setSettings } from '../../sdk/util/settings';
import { App, AppCreateOptions } from '../../sdk/controllers/App';
import { createSigner, getTonomyOperationsKey } from '../../sdk/services/blockchain';

export default async function apps(args: string[]) {
    if (args[0] === 'create') {
        console.log('Creating new app');

        const options: AppCreateOptions = {
            appName: args[0],
            usernamePrefix: args[1],
            description: args[2],
            logoUrl: args[3],
            origin: args[4],
            publicKey: PublicKey.from(args[5]),
            signer: createSigner(getTonomyOperationsKey()),
        };
        const blockchainUrl = args[6];

        setSettings({
            blockchainUrl,
        });

        const res = await App.create(options);

        console.log('New app created with username: ', res.username?.username);
        console.log('and account name: ', res.accountName.toString());
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
