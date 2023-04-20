import { Checksum256, PrivateKey, PublicKey, Signature } from '@greymass/eosio';
declare enum KeyManagerLevel {
    PASSWORD = "PASSWORD",
    PIN = "PIN",
    FINGERPRINT = "FINGERPRINT",
    LOCAL = "LOCAL",
    BROWSER_LOCAL_STORAGE = "BROWSER_LOCAL_STORAGE",
    BROWSER_SESSION_STORAGE = "BROWSER_SESSION_STORAGE"
}
declare namespace KeyManagerLevel {
    function indexFor(value: KeyManagerLevel): number;
    function from(value: number | string): KeyManagerLevel;
}
/**
 * @param level - The security level of the key
 * @param privateKey - The private key to be stored
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
declare type StoreKeyOptions = {
    level: KeyManagerLevel;
    privateKey: PrivateKey;
    challenge?: string;
};
/**
 * @param level - The security level of the key
 * @param data - The data that will be used to create a digital signature
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
declare type SignDataOptions = {
    level: KeyManagerLevel;
    data: string | Checksum256;
    challenge?: string;
    outputType?: 'jwt' | 'transaction';
};
/**
 * @param level - The security level of the key
 */
declare type GetKeyOptions = {
    level: KeyManagerLevel;
};
/**
 * @param level - The security level of the key
 * @param challenge - the challenge to check
 */
declare type CheckKeyOptions = {
    level: KeyManagerLevel;
    challenge: string;
};
interface KeyManager {
    /**
     * Stores a private key that can be used later for signing.
     *
     * @remarks
     * Once a private key is stored, it may no longer be accessible.
     *
     * @param options - Options for storing the key
     * @returns The PublicKey
     */
    storeKey(options: StoreKeyOptions): Promise<PublicKey>;
    /**
     * Signs the hash of data with a stored private key
     *
     * @param options - Options for signing data
     * @returns A digital signature of the SHA256 hashed data
     *
     * @throws if a key does not exist for the level the challenge is incorrect
     */
    signData(options: SignDataOptions): Promise<string | Signature>;
    /**
     * Returns the public key of a stored private key
     *
     * @param options - Options for retreiving the key
     * @returns The PublicKey or null if no key exists
     */
    getKey(options: GetKeyOptions): Promise<PublicKey | null>;
    /**
     * @param options - Options for removing a key
     * @throws if a key does not exist for the level
     */
    removeKey(options: GetKeyOptions): Promise<void>;
    /**
     * generates a random private key
     *
     * @returns The PrivateKey
     */
    generateRandomPrivateKey(): PrivateKey;
    /**
     * generates a private key from a password and creates random salt
     * @param password password to encrypt the private key with
     * @returns encrypted private key and salt
     *
     */
    generatePrivateKeyFromPassword(password: string, salt?: Checksum256): Promise<{
        privateKey: PrivateKey;
        salt: Checksum256;
    }>;
    /**
     * checks the key against the provided challenge
     * @param {CheckKeyOptions} options - for checking key with level, and challenge
     * @returns {boolean} - returns matching status
     *
     * @throws  if challenge is not provided
     */
    checkKey(options: CheckKeyOptions): Promise<boolean>;
}
export { KeyManager, KeyManagerLevel, StoreKeyOptions, SignDataOptions, GetKeyOptions, CheckKeyOptions };
