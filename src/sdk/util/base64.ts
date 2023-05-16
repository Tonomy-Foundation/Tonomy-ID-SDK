// From utf8 to base64url and visa versa
import { decode as b64UrlDecode, encode as b64UrlEncode } from 'universal-base64url';
import { decode as b64Decode, encode as b64Encode } from 'universal-base64';
import { BN } from 'bn.js';
import * as u8a from 'uint8arrays';

// Adapted from https://github.com/decentralized-identity/did-jwt/blob/056b2e422896436b781ecab2b466bacf72708d23/src/util.ts
export function bnToBase64Url(bn: typeof BN): string {
    const bnString = bn.toString();
    const bi = BigInt(bnString);
    const biBytes = bigintToBytes(bi);

    return bytesToBase64(biBytes);
}

// Copied from https://github.com/decentralized-identity/did-jwt/blob/056b2e422896436b781ecab2b466bacf72708d23/src/util.ts
export function bytesToBase64(b: Uint8Array): string {
    return u8a.toString(b, 'base64pad');
}

// Copied from https://github.com/decentralized-identity/did-jwt/blob/056b2e422896436b781ecab2b466bacf72708d23/src/util.ts
export function bigintToBytes(n: bigint): Uint8Array {
    const b64 = n.toString(16);

    return u8a.fromString(b64.padStart(64, '0'), 'base16');
}

// utf8 string to base64
export function strToBase64(str: string) {
    return b64Encode(str);
}

// base64 to utf8 string
export function base64ToStr(str: string) {
    return b64Decode(str);
}

// utf8 string to base64url
export function strToBase64Url(str: string): string {
    return b64UrlEncode(str);
}

export function objToBase64Url(obj: object): string {
    return b64UrlEncode(JSON.stringify(obj));
}

// base64url to utf8 string
export function base64UrlToStr(str: string): string {
    return b64UrlDecode(str);
}

export function base64UrlToObj(str: string): object | any {
    return JSON.parse(b64UrlDecode(str));
}
