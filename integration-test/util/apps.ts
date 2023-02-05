import { Name } from '@greymass/eosio';
import { randomString, IDContract, EosioUtil, AccountType, TonomyUsername } from 'tonomy-id-sdk';
import settings from '../services/settings';
import { privateKey } from './eosio';

const idContract: IDContract = IDContract.Instance;

export async function createRandomApp(logo_url?: string, origin?: string) {
    const name = randomString(8);
    const description = randomString(80);
    const username = TonomyUsername.fromUsername(randomString(8), AccountType.APP, settings.accountSuffix);
    if (!origin) origin = 'http://localhost:3000';
    if (!logo_url) logo_url = 'http://localhost:3000/logo.png';

    const res = await idContract.newapp(
        name,
        description,
        username.usernameHash,
        logo_url,
        origin,
        privateKey.toPublic(),
        EosioUtil.createSigner(privateKey)
    );

    const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
    const accountName = Name.from(newAccountAction.data.name);

    return { name, description, username, logo_url, origin, accountName };
}
