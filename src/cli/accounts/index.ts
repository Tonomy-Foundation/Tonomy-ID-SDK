import { Name } from '@wharfkit/antelope';
import { AccountType, getTonomyContract, TonomyUsername, getAccountInfo } from '../../sdk';
import settings from '../settings';

export default async function accounts(args: string[]) {
    if (args[0] === 'get') {
        const username = args[1];

        if (username.startsWith('@')) {
            console.log('Searching for username: ', username);

            const usernameInstance = TonomyUsername.fromUsername(
                username.split('@')[1],
                AccountType.PERSON,
                settings.config.accountSuffix
            );
            const { account_name: account } = await getTonomyContract().getPerson(usernameInstance);

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
