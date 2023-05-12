import { Secp256k1KeyPair } from '@transmute/secp256k1-key-pair';
import { getResolver } from '@transmute/did-key-common';

export async function resolve(did: string, options?: any) {
    const resolve = getResolver(Secp256k1KeyPair);

    const { didDocument } = await resolve(did, { ...options, accept: 'application/did+json' });

    return { didDocument };
}

import { createAgent } from '@veramo/core';

const agent = createAgent({
    authorizedMethods: ['did:key'],
});

agent.availableMethods();
