import { Name } from '@wharfkit/antelope';
import { AccountType, SdkError, SdkErrors, TonomyContract, TonomyUsername, getAccountInfo } from '../../sdk';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';

setSettings(settings.config);

const tonomyContract = TonomyContract.Instance;

export default async function apps(args: string[]) {
    if (args[0] === 'get') {
        const username = args[1];

        try {
            console.log('Searching for username: ', username);

            const usernameInstance = TonomyUsername.fromUsername(
                username,
                AccountType.PERSON,
                settings.config.accountSuffix
            );
            const { account_name: account } = await tonomyContract.getPerson(usernameInstance);

            console.log('Account name: ', account.toString());
        } catch (e) {
            if (e instanceof SdkError && e.code === SdkErrors.UsernameNotFound) {
                console.log('Username not found')
                console.log('Searching for account: ', username);

                const account = await getAccountInfo(Name.from(username));

                console.log('Account: ', JSON.stringify(account, null, 2));
            } else {
                throw e;
            }
        }
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
