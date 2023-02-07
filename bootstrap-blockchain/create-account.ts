import { publicKey } from './keys';
import { Authority, EosioContract, App, AppCreateOptions } from '../src/index';

const eosioContract: EosioContract = EosioContract.Instance;

export async function createAccount({ account }, signer) {
    const ownerAuth = Authority.fromKey(publicKey.toString());

    const activeAuth = Authority.fromKey(publicKey.toString());

    // need to add the eosio.code authority as well so that it can call eosio from the smart contract
    ownerAuth.addCodePermission(account);
    activeAuth.addCodePermission(account);
    await eosioContract.newaccount('eosio', account, ownerAuth, activeAuth, signer);
}

export async function createApp(options: AppCreateOptions) {
    const res = await App.create(options);
    console.log('New app created with username: ', res.username.username);
}
