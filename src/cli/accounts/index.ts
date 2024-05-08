import { AccountType, TonomyContract, TonomyUsername } from '../../sdk';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';

setSettings(settings.config);

const tonomyContract = TonomyContract.Instance;

export default async function apps(args: string[]) {
    if (args[0] === 'get') {
        const username = args[1];

        console.log('Searching for username: ', username);

        const usernameInstance = TonomyUsername.fromUsername(
            username,
            AccountType.PERSON,
            settings.config.accountSuffix
        );
        const { account_name: account } = await tonomyContract.getPerson(usernameInstance);

        console.log('Account name: ', account.toString());
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
