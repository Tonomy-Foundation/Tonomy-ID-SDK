// From utf8 to base64url and visa versa
import { decode, encode } from 'universal-base64url';

export function objToBase64Url(obj: object): string {
    return encode(JSON.stringify(obj));
}

export function base64UrlToObj(str: string): object | any {
    return JSON.parse(decode(str));
}
