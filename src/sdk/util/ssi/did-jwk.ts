import { PublicKey } from '@wharfkit/antelope';
import { ResolverRegistry, ParsedDID, DIDResolutionResult } from '@tonomy/did-resolver';
import { agent } from './veramoAgent';
import { bytesToHex } from '@tonomy/did-jwt/lib/util';
import { DIDurl } from './types';

export async function publicKeyToDidKey(publicKey: PublicKey): Promise<DIDurl> {
    const keyHex = bytesToHex(publicKey.data.array);

    const identifier = await agent.didManagerImport({
        did: 'did:key:1',
        // alias: 'did:key 1',
        provider: 'did:key',
        keys: [
            {
                privateKeyHex: keyHex,
                type: 'Secp256k1',
                kms: 'local',
            },
        ],
    });

    return identifier.did;
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L177
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolve(did: any, options = {}): Promise<DIDResolutionResult> {
    if (options) options = {};

    return (await agent.resolveDid({ didUrl: did })) as any;
}

export function getResolver(): ResolverRegistry {
    return {
        key: (
            did: string,
            // @ts-expect-error(TS6133 declared but never used)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            parsed: ParsedDID,
            // @ts-expect-error(TS6133 declared but never used)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            resolver: Resolvable
        ) => {
            return resolve(did);
        },
    } as any;
}
