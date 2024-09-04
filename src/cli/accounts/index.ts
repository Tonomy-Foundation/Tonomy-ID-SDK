import { Name } from '@wharfkit/antelope';
import { AccountType, Authority, SdkError, SdkErrors,   TonomyContract, TonomyUsername, getAccountInfo } from '../../sdk';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';
import {  getSigner } from '../bootstrap/keys';
import {  transact } from '../../sdk/services/blockchain';

setSettings(settings.config);
const signer = getSigner();

const tonomyContract = TonomyContract.Instance;
// const eosioContract = EosioContract.Instance;

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
                console.log('Username not found');
                console.log('Searching for account: ', username);

                const account = await getAccountInfo(Name.from(username));

                console.log('Account: ', JSON.stringify(account, null, 2));
            } else {
                throw e;
            }
        }
    } else if (args[0] === 'create') {
        console.log('Creating new account');
        const accountNames = [
            'dao.1111',
            // 'voice.hypha',
            // 'hypha.hypha',
            // 'husd.hypha',
            // 'kv.hypha',
            // 'join.hypha',
            // 'srvice.hypha'
        ];
    
        // Use provided accountKey or default
        const accountKey = 'EOS5DMPJ4DsJ2Vc4f7g5o8z9o5HswcpXrE4C58r7wxxzZgYxQn8rB';
    
        const actions = accountNames.map(accountName => {
            // Create owner and active authorities
            const ownerAuth = Authority.fromKey(accountKey);
            const activeAuth = Authority.fromKey(accountKey);
    
            // Add code permissions for the account
            ownerAuth.addCodePermission(accountName);
            activeAuth.addCodePermission(accountName);
    
            return {
                account: 'tonomy',
                name: 'newaccount',
                authorization: [
                    {
                        actor: 'tonomy',
                        permission: 'owner',
                    },
                    {
                        actor: 'tonomy',
                        permission: 'active',
                    },
                ],
                data: {
                    creator: 'tonomy',
                    name: accountName,
                    owner: ownerAuth,
                    active: activeAuth,
                },
            };
        });
        await transact(Name.from('tonomy'), actions, signer);

       
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
