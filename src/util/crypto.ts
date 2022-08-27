import { Checksum256 } from '@greymass/eosio';
import crypto from 'crypto';

function randomBytes(bytes: number): Buffer {
    return crypto.randomBytes(bytes);
}

function randomString(bytes: number): string {
    return randomBytes(bytes).toString('hex');
}

function sha256(digest: string): string {
    return Checksum256.hash(Buffer.from(digest)).toString();
}

export { randomString, randomBytes, sha256 };