import { Name } from '@wharfkit/antelope';
import { DIDurl } from './types';
import { ParsedDID, parse } from '@tonomy/did-resolver';

export function getAccountNameFromDid(did: DIDurl): Name {
    const parsed = parseDid(did);

    const id = parsed.id.split(':');
    const accountName = id[id.length - 1];

    return Name.from(accountName);
}

export function parseDid(did: DIDurl): ParsedDID {
    const parsed = parse(did);

    if (!parsed) throw new Error('Invalid DID');

    return parsed;
}
