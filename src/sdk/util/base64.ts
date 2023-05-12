// universal-base64url converts from base64url to utf8 and vice versa
import { decode, encode } from 'universal-base64url';
import { BN } from 'bn.js';

// Inspired by https://github.com/davidchambers/Base64.js/blob/master/base64.js
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const Base64 = {
    btoa: (input = '') => {
        const str = input;
        let output = '';

        for (
            let block = 0, charCode, i = 0, map = chars;
            str.charAt(i | 0) || ((map = '='), i % 1);
            output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
        ) {
            charCode = str.charCodeAt((i += 3 / 4));

            if (charCode > 0xff) {
                throw new Error(
                    "'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
                );
            }

            block = (block << 8) | charCode;
        }

        return output;
    },

    atob: (input = '') => {
        const str = input.replace(/=+$/, '');
        let output = '';

        if (str.length % 4 === 1) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }

        for (
            let bc = 0, bs = 0, buffer, i = 0;
            (buffer = str.charAt(i++));
            ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
                ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
                : 0
        ) {
            buffer = chars.indexOf(buffer);
        }

        return output;
    },
};

// Polyfill for React Native which does not have Buffer, or atob/btoa
// TODO maybe do this at global level?
if (typeof Buffer === 'undefined') {
    if (typeof window === 'undefined' || typeof window.atob === 'undefined') {
        window.atob = Base64.atob;
        window.btoa = Base64.btoa;
    }
}

export function bnToBase64Url(bn: typeof BN): string {
    console.log('bnToBase64Url', bn.toString());

    if (typeof Buffer !== 'undefined') {
        // nodejs
        const buffer = (bn as any).toArrayLike(Buffer, 'be') as Buffer;
        const utf8 = buffer.toString('utf8');

        return encode(utf8);
    } else {
        // browser
        // BN.toString() will PAD with 0s!!!
        const byteArray = (bn as any).toArrayLike(Uint8Array, 'be') as Uint8Array;
        const utf8 = new TextDecoder().decode(byteArray);

        return encode(utf8);
    }
}

export function hexToBase64(hexstring: string) {
    return window.btoa(
        (hexstring as any)
            .match(/\w{2}/g)
            .map(function (a: string) {
                return String.fromCharCode(parseInt(a, 16));
            })
            .join('')
    );
}

export function utf8ToB64(str: string) {
    if (typeof Buffer !== 'undefined') {
        // nodejs
        return Buffer.from(str).toString('base64');
    } else {
        // browser
        return window.btoa(unescape(encodeURIComponent(str)));
    }
}

export function b64ToUtf8(str: string) {
    if (typeof Buffer !== 'undefined') {
        // nodejs
        return Buffer.from(str, 'base64').toString('utf8');
    } else {
        // browser
        return decodeURIComponent(escape(window.atob(str)));
    }
}

export function strToBase64Url(str: string): string {
    return encode(str);
}

export function objToBase64Url(obj: object): string {
    return encode(JSON.stringify(obj));
}

export function base64UrlToStr(str: string): string {
    return decode(str);
}

export function base64UrlToObj(str: string): object | any {
    return JSON.parse(decode(str));
}
