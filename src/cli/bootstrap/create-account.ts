import { Authority, App, AppCreateOptions, getEosioContract } from '../../sdk/index';
import { Signer } from '../../sdk/services/blockchain/eosio/transaction';
import { getDefaultAntelopePublicKey } from './keys';

export async function createAntelopeAccount({ account, key }: { account: string; key?: string }, signer: Signer) {
    const accountKey = key ?? getDefaultAntelopePublicKey().toString();
    const ownerAuth = Authority.fromKey(accountKey);

    const activeAuth = Authority.fromKey(accountKey);

    // need to add the eosio.code authority as well so that it can call eosio from the smart contract
    ownerAuth.addCodePermission(account);
    activeAuth.addCodePermission(account);
    await getEosioContract().newAccount('eosio', account, ownerAuth, activeAuth, signer);
}

export async function createApp(options: AppCreateOptions): Promise<App> {
    const res = await App.create(options);

    console.log('New app created with username: ', res.username?.username, options.origin);

    return res;
}
