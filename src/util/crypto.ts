import { Checksum256 } from '@greymass/eosio';
import crypto from 'crypto';

function randomString(bytes: number): string {
    return crypto.randomBytes(bytes).toString('hex');
}

function sha256(digest: string): string {
    return Checksum256.hash(Buffer.from(digest)).toString();
}

export { randomString, sha256 };