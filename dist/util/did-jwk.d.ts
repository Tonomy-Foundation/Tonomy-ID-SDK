import { PublicKey } from '@greymass/eosio';
export declare function createJWK(publicKey: PublicKey): {
    crv: string;
    kty: string;
    x: string;
    y: string;
    kid: string;
};
export declare function toDid(jwk: any): string;
export declare function toDidDocument(jwk: any): {
    '@context': (string | {
        '@vocab': string;
    })[];
    id: string;
    verificationMethod: {
        id: string;
        type: string;
        controller: string;
        publicKeyJwk: any;
    }[];
};
export declare function resolve(did: any, options?: {}): {
    '@context': (string | {
        '@vocab': string;
    })[];
    id: string;
    verificationMethod: {
        id: string;
        type: string;
        controller: string;
        publicKeyJwk: any;
    }[];
};
