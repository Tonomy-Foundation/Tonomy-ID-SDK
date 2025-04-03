import { PublicKey } from '@wharfkit/antelope';
import { App, AppCreateOptions } from '../../sdk/controllers/App';
import { createSigner, getTonomyOperationsKey } from '../../sdk/services/blockchain';

export default async function apps(args: string[]) {
    if (args[0] === 'create') {
        console.log('Creating new app');

        const options: AppCreateOptions = {
            appName: args[1],
            usernamePrefix: args[2],
            description: args[3],
            logoUrl: args[4],
            origin: args[5],
            backgroundColor: args[6],
            accentColor: args[8],
            publicKey: PublicKey.from(args[9]),
            signer: createSigner(getTonomyOperationsKey()),
        };

        const res = await App.create(options);

        console.log('New app created with username: ', res.username?.username);
        console.log('and account name: ', res.accountName.toString());
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
