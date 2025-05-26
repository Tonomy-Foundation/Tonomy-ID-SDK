import { Name } from '@wharfkit/antelope';
import { AccountType, TonomyUsername, getAccountInfo, tonomyContract } from '../../sdk';
import settings from '../settings';

export default async function apps(args: string[]) {
    if (args[0] === 'get') {
        const username = args[1];

        if (username.startsWith('@')) {
            console.log('Searching for username: ', username);

            const usernameInstance = TonomyUsername.fromUsername(
                username.split('@')[1],
                AccountType.PERSON,
                settings.config.accountSuffix
            );
            const { accountName: account } = await tonomyContract.getPerson(usernameInstance);

            console.log('Account name: ', account.toString());
        } else {
            console.log('Searching for account: ', username);

            const account = await getAccountInfo(Name.from(username));

            console.log('Account: ', JSON.stringify(account, null, 2));
        }
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
