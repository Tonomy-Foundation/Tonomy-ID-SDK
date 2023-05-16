import { PublicKey } from '@greymass/eosio';
import { toElliptic } from '../crypto';
import { b64ToUtf8, base64UrlToStr, bnToBase64Url, strToBase64Url, utf8ToB64 } from '../base64';
import { ResolverRegistry, ParsedDID, DIDResolutionResult, DIDDocument } from '@tonomy/did-resolver';

export function createJWK(publicKey: PublicKey) {
    const ecPubKey = toElliptic(publicKey);

    const publicKeyJwk = {
        crv: 'secp256k1',
        kty: 'EC',
        x: bnToBase64Url(ecPubKey.getPublic().getX() as any),
        y: bnToBase64Url(ecPubKey.getPublic().getY() as any),
        kid: publicKey.toString(),
    };

    return publicKeyJwk;
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L120
export function toDid(jwk: any) {
    // eslint-disable-next-line no-unused-vars
    const { d, p, q, dp, dq, qi, ...publicKeyJwk } = jwk;
    // TODO replace with base64url encoder for web
    const id = utf8ToB64(JSON.stringify(publicKeyJwk));

    const did = `did:jwk:${id}`;

    return did;
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L128
export function toDidDocument(jwk: any): DIDDocument {
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
        // eslint-disable-next-line no-unused-vars
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

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L177
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolve(did: any, options = {}): Promise<DIDResolutionResult> {
    if (options) options = {};
    const decoded = b64ToUtf8(did.split(':').pop().split('#')[0]);
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
        jwk: (
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
