import { Checksum256, PrivateKey, PublicKey, Signature } from '@greymass/eosio';

enum KeyManagerLevel {
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    FINGERPRINT = 'FINGERPRINT',
    LOCAL = 'LOCAL',
};

namespace KeyManagerLevel {
    /* 
     * Returns the index of the enum value
     * 
     * @param value The level to get the index of
     */
    export function indexFor(value: KeyManagerLevel): number {
        return Object.keys(KeyManagerLevel).indexOf(value);
    }

    /* 
     * Creates an AuthenticatorLevel from a string or index of the level
     * 
     * @param value The string or index
     */
    export function from(value: number | string): KeyManagerLevel {
        let index: number
        if (typeof value !== 'number') {
            index = KeyManagerLevel.indexFor(value as KeyManagerLevel)
        } else {
            index = value
        }
        return Object.values(KeyManagerLevel)[index] as KeyManagerLevel;
    }
}

/**
 * @param level - The security level of the key
 * @param privateKey - The private key to be stored
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
type StoreKeyOptions = {
    level: KeyManagerLevel;
    privateKey: PrivateKey;
    challenge?: string;
}

/**
 * @param level - The security level of the key
 * @param data - The data that will be used to create a digital signature
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
type SignDataOptions = {
    level: KeyManagerLevel;
    data: string | Checksum256;
    challenge?: string
}

/**
 * @param level - The security level of the key
 */
type GetKeyOptions = {
    level: KeyManagerLevel;
}

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
    storeKey(options: StoreKeyOptions): Promise<PublicKey>

    /**
     * Signs the hash of data with a stored private key
     *
     * @param options - Options for signing data
     * @returns A digital signature of the SHA256 hashed data
     * 
     * @throws if a key does not exist for the level the challenge is incorrect
     */
    signData(options: SignDataOptions): Promise<string | Signature>

    /**
     * Returns the public key of a stored private key
     *
     * @param options - Options for retreiving the key
     * @returns The PublicKey
     * 
     * @throws if a key does not exist for the level
     */
    getKey(options: GetKeyOptions): Promise<PublicKey>

    /**
     * @param options - Options for removing a key
     * @throws if a key does not exist for the level
     */
    removeKey(options: GetKeyOptions): void

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
    generatePrivateKeyFromPassword(password: string, salt?: Checksum256): Promise<{ privateKey: PrivateKey, salt: Checksum256 }>;

}





export { KeyManager, KeyManagerLevel, StoreKeyOptions, SignDataOptions, GetKeyOptions };