import { Bytes, Checksum256, KeyType, PrivateKey, PublicKey } from '@greymass/eosio';
import rb from '@consento/sync-randombytes';
import elliptic from 'elliptic';
import { SdkErrors, throwError } from './errors';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';

const secp256k1 = new elliptic.ec('secp256k1');

export function randomBytes(bytes: number): Uint8Array {
    return rb(new Uint8Array(bytes));
}

function validateKey(keyPair: elliptic.ec.KeyPair) {
    const result = keyPair.validate();

    if (!result.result) {
        throwError(`Key not valid with reason ${result.reason}`, SdkErrors.InvalidKey);
    }
}

export function toElliptic(key: PrivateKey | PublicKey): elliptic.ec.KeyPair {
    let ecKeyPair: elliptic.ec.KeyPair;

    if (key instanceof PublicKey) {
        ecKeyPair = secp256k1.keyFromPublic(key.data.array);
    } else {
        ecKeyPair = secp256k1.keyFromPrivate(key.data.array);
    }

    validateKey(ecKeyPair);

    return ecKeyPair;
}

export function randomString(bytes: number): string {
    const random = rb(new Uint8Array(bytes));

    return Array.from(random).map(int2hex).join('');
}

export function sha256(digest: string): string {
    return Checksum256.hash(Bytes.from(encodeHex(digest), 'hex')).toString();
}

export function int2hex(i: number) {
    return ('0' + i.toString(16)).slice(-2);
}

export function encodeHex(str: string): string {
    return str
        .split('')
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
}

export function decodeHex(hex: string): string {
    return hex
        .split(/(\w\w)/g)
        .filter((p) => !!p)
        .map((c) => String.fromCharCode(parseInt(c, 16)))
        .join('');
}

export function generateRandomKeyPair(): { privateKey: PrivateKey; publicKey: PublicKey } {
    const bytes = randomBytes(32);
    const privateKey = new PrivateKey(KeyType.K1, new Bytes(bytes));
    const publicKey = privateKey.toPublic();

    return { privateKey, publicKey };
}

export function createVCSigner(keyManager: KeyManager, level: KeyManagerLevel) {
    return {
        async sign(data: string) {
            return await keyManager.signData({
                level,
                data,
                outputType: 'jwt',
            });
        },
    };
}
