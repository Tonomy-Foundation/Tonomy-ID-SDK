import { PrivateKey, PublicKey } from '@greymass/eosio';
import elliptic from 'elliptic';
import { KeyManager, KeyManagerLevel } from '../services/keymanager';
export declare function randomBytes(bytes: number): Uint8Array;
export declare function toElliptic(key: PrivateKey | PublicKey): elliptic.ec.KeyPair;
export declare function randomString(bytes: number): string;
export declare function sha256(digest: string): string;
export declare function int2hex(i: number): string;
export declare function encodeHex(str: string): string;
export declare function decodeHex(hex: string): string;
export declare function generateRandomKeyPair(): {
    privateKey: PrivateKey;
    publicKey: PublicKey;
};
export declare function createVCSigner(keyManager: KeyManager, level: KeyManagerLevel): {
    sign(data: string): Promise<string | import("@greymass/eosio").Signature>;
};
