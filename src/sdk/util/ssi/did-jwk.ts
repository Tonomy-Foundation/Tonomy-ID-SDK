import { base64ToStr, strToBase64 } from '../base64';
import { ResolverRegistry, ParsedDID, DIDResolutionResult, DIDDocument, Resolvable } from 'did-resolver';
import { JWK } from '@tonomy/antelope-did-resolver';

interface JWKExtended extends JWK {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    key_ops?: string[];
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L120
export function toDid(jwk: JWKExtended) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { d, p, q, dp, dq, qi, ...publicKeyJwk }: JWKExtended = jwk;
    // TODO replace with base64url encoder for web
    const id = strToBase64(JSON.stringify(publicKeyJwk));

    const did = `did:jwk:${id}`;

    return did;
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L128
export function toDidDocument(jwk: JWKExtended): DIDDocument {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getPublicOperationsFromPrivate = (keyOps: any) => {
        if (keyOps.includes('sign')) {
            return ['verify'];
        }

        if (keyOps.includes('verify')) {
            return ['encrypt'];
        }

        return keyOps;
    };

    const {
        d,
        p,
        q,
        dp,
        dq,
        qi,
        // eslint-disable-next-line camelcase
        key_ops,
        ...publicKeyJwk
    } = jwk;

    // eslint-disable-next-line camelcase
    if (d && key_ops) {
        // @ts-expect-error key_ops
        // eslint-disable-next-line camelcase
        publicKeyJwk.key_ops = getPublicOperationsFromPrivate(key_ops);
    }

    const did = toDid(publicKeyJwk);
    const vm = {
        id: '#0',
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk,
    };
    const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1', { '@vocab': 'https://www.iana.org/assignments/jose#' }],
        id: did,
        verificationMethod: [vm],
    } as DIDDocument;

    return didDocument;
}

export async function resolve(did: string, options = {}): Promise<DIDResolutionResult> {
    console.log('resolve() resolving did:jwk');
    if (options) options = {};
    const decoded = base64ToStr(did.split(':').pop().split('#')[0]);
    const jwk = JSON.parse(decoded.toString());

    const didDoc = toDidDocument(jwk);

    return {
        didResolutionMetadata: { contentType: 'application/did+ld+json' },
        didDocument: didDoc,
        didDocumentMetadata: {},
    };
}

export function getResolver(): ResolverRegistry {
    return {
        jwk: (did: string, parsed: ParsedDID, resolver: Resolvable) => {
            return resolve(did);
        },
    };
}
