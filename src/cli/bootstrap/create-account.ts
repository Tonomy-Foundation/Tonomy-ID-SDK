import { publicKey } from './keys';
import { Authority, EosioContract, App, AppCreateOptions } from '../../sdk/index';
import { Signer } from '../../sdk/services/blockchain/eosio/transaction';

const eosioContract: EosioContract = EosioContract.Instance;

export async function createAntelopeAccount({ account }: { account: string }, signer: Signer) {
    const ownerAuth = Authority.fromKey(publicKey.toString());

    const activeAuth = Authority.fromKey(publicKey.toString());

    // need to add the eosio.code authority as well so that it can call eosio from the smart contract
    ownerAuth.addCodePermission(account);
    activeAuth.addCodePermission(account);
    await eosioContract.newaccount('eosio', account, ownerAuth, activeAuth, signer);
}

export async function createApp(options: AppCreateOptions): Promise<App> {
    const res = await App.create(options);

    console.log('New app created with username: ', res.username?.username);

    return res;
}
