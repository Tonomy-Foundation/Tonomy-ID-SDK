import { KeyManager, KeyManagerLevel, SignDataOptions, GetKeyOptions, StoreKeyOptions, CheckKeyOptions } from '../../src/services/keymanager';
import { Checksum256, PrivateKey, PublicKey, Signature } from '@greymass/eosio';
declare type KeyStorage = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    hashedSaltedChallenge?: string;
    salt?: string;
};
export declare class JsKeyManager implements KeyManager {
    keyStorage: {
        [key in KeyManagerLevel]: KeyStorage;
    };
    generateRandomPrivateKey(): PrivateKey;
    generatePrivateKeyFromPassword(password: string, salt?: Checksum256): Promise<{
        privateKey: PrivateKey;
        salt: Checksum256;
    }>;
    storeKey(options: StoreKeyOptions): Promise<PublicKey>;
    signData(options: SignDataOptions): Promise<string | Signature>;
    getKey(options: GetKeyOptions): Promise<PublicKey>;
    checkKey(options: CheckKeyOptions): Promise<boolean>;
    removeKey(options: GetKeyOptions): Promise<void>;
}
export {};
