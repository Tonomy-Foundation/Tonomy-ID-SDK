import { Bytes, Checksum256 } from '@greymass/eosio';
import rb from '@consento/sync-randombytes';

function randomBytes(bytes: number): Uint8Array {
    return rb(new Uint8Array(bytes));
}

function randomString(bytes: number): string {
    const random = rb(new Uint8Array(bytes));
    return Array.from(random).map(int2hex).join('');
}

function sha256(digest: string): string {
    return Checksum256.hash(Bytes.from(encodeHex(digest), 'hex')).toString();
}

function int2hex(i: number) {
    return ('0' + i.toString(16)).slice(-2);
}

function encodeHex(str: string): string {
    return str
        .split('')
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

function decodeHex(hex: string): string {
    return hex
        .split(/(\w\w)/g)
        .filter((p) => !!p)
        .map((c) => String.fromCharCode(parseInt(c, 16)))
        .join('');
}

export { randomString, randomBytes, sha256, decodeHex, encodeHex };
