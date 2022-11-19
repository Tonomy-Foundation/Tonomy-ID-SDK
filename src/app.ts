/* eslint-disable camelcase */
import { Bytes, KeyType, PrivateKey, PublicKey } from '@greymass/eosio';
import randomBytes from 'randombytes';
import { ES256KSigner, createJWT } from 'did-jwt';
import * as jose from 'jose';
import { PublicKey as PublicKeyCon } from 'eosjs/dist/eosjs-key-conversions';
function generateRandomKeyPair(): { privateKey: PrivateKey; publicKey: PublicKey } {
    const bytes = randomBytes(32);
    const privateKey = new PrivateKey(KeyType.K1, new Bytes(bytes));
    const publicKey = privateKey.toPublic();
    return { privateKey, publicKey };
}

async function onPressLogin(redirect: string): Promise<string> {
    const { privateKey, publicKey } = generateRandomKeyPair();
    const payload = {
        number: Math.floor(Math.random() * 100),
        // domain: window.location.hostname,
        redirect,
        pubkey: publicKey.toString(),
    };

    const signer = ES256KSigner(privateKey.data.array, true);

    const jwk = await createJWK(publicKey);
    const issuer = toDid(jwk);
    const token = await createJWT(payload, { issuer, signer, alg: 'ES256K-R' });
    return token;
}

const createJWK = (publicKey: PublicKey) => {
    const pubKey = PublicKeyCon.fromString(publicKey.toString());
    const ecPubKey = pubKey.toElliptic();

    if (!pubKey.isValid()) throw new Error('Key is not valid');
    const publicKeyJwk = {
        crv: 'secp256k1',
        kty: 'EC',
        x: bnToBase64Url(ecPubKey.getPublic().getX()),
        y: bnToBase64Url(ecPubKey.getPublic().getY()),
        kid: pubKey.toString(),
    };
    return publicKeyJwk;
};
const toDid = (jwk: jose.JWK) => {
    // eslint-disable-next-line no-unused-vars
    const { d, p, q, dp, dq, qi, ...publicKeyJwk } = jwk;
    // TODO replace with base64url encoder for web
    const id = jose.base64url.encode(JSON.stringify(publicKeyJwk));
    const did = `did:jwk:${id}`;
    return did;
};

const toDidDocument = (jwk: jose.JWK) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getPublicOperationsFromPrivate = (key_ops: any) => {
        if (key_ops.includes('sign')) {
            return ['verify'];
        }
        if (key_ops.includes('verify')) {
            return ['encrypt'];
        }
        return key_ops;
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
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolve = (did: any) => {
    const decoded = jose.base64url.decode(did.split(':').pop().split('#')[0]);
    const jwk = JSON.parse(decoded.toString());
    return toDidDocument(jwk);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bnToBase64Url(bn: any): string {
    const buffer = bn.toArrayLike(Buffer, 'be');
    // TODO replace with base64url encoder for web
    return Buffer.from(buffer).toString('base64');
}

export { onPressLogin, generateRandomKeyPair, resolve };
