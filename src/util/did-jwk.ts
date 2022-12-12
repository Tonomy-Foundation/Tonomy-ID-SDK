import { PublicKey } from '@greymass/eosio';
import { toElliptic } from './crypto';

export function createJWK(publicKey: PublicKey) {
    const ecPubKey = toElliptic(publicKey);

    const publicKeyJwk = {
        crv: 'secp256k1',
        kty: 'EC',
        x: bnToBase64Url(ecPubKey.getPublic().getX()),
        y: bnToBase64Url(ecPubKey.getPublic().getY()),
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
export function toDidDocument(jwk: any) {
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

        key_ops,

        ...publicKeyJwk
    } = jwk;

    if (d && key_ops) {
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
    };

    return didDocument;
}

// reference https://github.com/OR13/did-jwk/blob/main/src/index.js#L177
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolve(did: any, options = {}) {
    if (options) options = {};
    const decoded = b64ToUtf8(did.split(':').pop().split('#')[0]);
    const jwk = JSON.parse(decoded.toString());
    return toDidDocument(jwk);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bnToBase64Url(bn: any): string {
    const buffer = bn.toArrayLike(Buffer, 'be');
    // TODO replace with base64url encoder for web
    return Buffer.from(buffer).toString('base64');
}

export function utf8ToB64(str: string) {
    // TODO dont depend on window
    return window.btoa(unescape(encodeURIComponent(str)));
}

export function b64ToUtf8(str: string) {
    return decodeURIComponent(escape(window.atob(str)));
}
