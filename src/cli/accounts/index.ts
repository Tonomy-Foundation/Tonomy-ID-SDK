import { Name, PrivateKey } from '@wharfkit/antelope';
import { AccountType, EosioContract, Authority, SdkError, SdkErrors, EosioUtil,  TonomyContract, TonomyUsername, getAccountInfo } from '../../sdk';
import { setSettings } from '../../sdk/util/settings';
import settings from '../bootstrap/settings';
import { getDefaultAntelopePublicKey } from '../bootstrap/keys';

setSettings(settings.config);

const tonomyContract = TonomyContract.Instance;
const eosioContract = EosioContract.Instance;

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
        const account = args[1];
        const accountKey = args[2] ?? getDefaultAntelopePublicKey().toString();
      
        const ownerAuth = Authority.fromKey(accountKey);

        const activeAuth = Authority.fromKey(accountKey);
        if(process.env.TONOMY_OPS_PRIVATE_KEY){
            const newPrivateKey = PrivateKey.from(process.env.TONOMY_OPS_PRIVATE_KEY);
            const newSigner = EosioUtil.createSigner(newPrivateKey);

            // need to add the eosio.code authority as well so that it can call eosio from the smart contract
            ownerAuth.addCodePermission(account);
            activeAuth.addCodePermission(account);
            await eosioContract.newaccount('eosio', account, ownerAuth, activeAuth, newSigner);
        } else{
            throw new Error(`TONOMY_OPS_PRIVATE_KEY not found`);
        }
    } else {
        throw new Error(`Unknown command ${args[0]}`);
    }
}
