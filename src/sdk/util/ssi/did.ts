import { Name } from '@greymass/eosio';
import { DIDurl } from './types';
import { parse } from '@tonomy/did-resolver';

export function getAccountNameFromDid(did: DIDurl): Name {
    const parsed = parse(did);

    if (!parsed) throw new Error('Invalid DID');

    const id = parsed.id.split(':');
    const accountName = id[id.length - 1];

    return Name.from(accountName);
}
