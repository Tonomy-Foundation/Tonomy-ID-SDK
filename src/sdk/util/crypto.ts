import { Bytes, Checksum256, KeyType, PrivateKey, PublicKey } from '@wharfkit/antelope';
import rb from '@consento/sync-randombytes';
import { throwError } from './errors';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { ES256KSigner, ES256Signer, Signer } from 'did-jwt';

export function randomBytes(bytes: number): Uint8Array {
    return rb(new Uint8Array(bytes));
}

function byteArrayToNumber(byteArray: Uint8Array) {
    let result = 0;

    for (let i = 0; i < byteArray.length; i++) {
        result += byteArray[i] << (i * 8);
    }

    return result;
}

export function randomNumber(min: number, max: number): number {
    if (min > max) {
        throwError('Min value cannot be greater than max value');
    }

    const range = max - min;
    const calculateByte = Math.floor(Math.log(range) / Math.log(256)) + 1;

    const randomBytesArray = randomBytes(calculateByte);

    const randomValue = (byteArrayToNumber(randomBytesArray) % (range + 1)) + min;

    return randomValue;
}

/*

/* Creates a signer from a private key that can be used to sign a JWT
 *
 * @param privateKey the private key to use to sign the JWT
 * @returns a signer (function) that can be used to sign a JWT
 */
export function createSigner(privateKey: PrivateKey): Signer {
    if (privateKey.type === KeyType.K1) {
        return ES256KSigner(privateKey.data.array, true);
    }

    if (privateKey.type === KeyType.R1 || privateKey.type === KeyType.WA) {
        return ES256Signer(privateKey.data.array);
    }

    throw new Error('Unsupported key type');
}

export function randomString(bytes: number): string {
    const random = randomBytes(bytes);

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
