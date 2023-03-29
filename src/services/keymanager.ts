import { Checksum256, PrivateKey, PublicKey, Signature } from '@greymass/eosio';

enum KeyManagerLevel {
    PASSWORD = 'PASSWORD',
    PIN = 'PIN',
    FINGERPRINT = 'FINGERPRINT',
    LOCAL = 'LOCAL',
    BROWSER_LOCAL_STORAGE = 'BROWSER_LOCAL_STORAGE',
    BROWSER_SESSION_STORAGE = 'BROWSER_SESSION_STORAGE',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
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
        let index: number;

        if (typeof value !== 'number') {
            index = KeyManagerLevel.indexFor(value as KeyManagerLevel);
        } else {
            index = value;
        }

        return Object.values(KeyManagerLevel)[index] as KeyManagerLevel;
    }
}

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {PrivateKey} privateKey - The private key to be stored
 * @param {string} [challenge] - A challenge that needs to be presented in order for the key to be used
 */
type StoreKeyOptions = {
    level: KeyManagerLevel;
    privateKey: PrivateKey;
    challenge?: string;
};

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {string | Checksum256} data - The data that will be used to create a digital signature
 * @param {string} [challenge] - A challenge that needs to be presented in order for the key to be used
 * @param {'jwt' | 'transaction'} [outputType] - The type of output to return
 */
type SignDataOptions = {
    level: KeyManagerLevel;
    data: string | Checksum256;
    challenge?: string;
    outputType?: 'jwt' | 'transaction';
};

/**
 * @param {KeyManagerLevel} level - The security level of the key
 */
type GetKeyOptions = {
    level: KeyManagerLevel;
};

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {string} challenge - the challenge to check
 */
type CheckKeyOptions = {
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
     * @param {StoreKeyOptions} options - Options for storing the key
     * @returns {Promise<PublicKey>} The public key
     */
    storeKey(options: StoreKeyOptions): Promise<PublicKey>;

    /**
     * Signs the hash of data with a stored private key
     *
     * @param {SignDataOptions} options - Options for signing data
     * @returns {Promise<string | Signature>} A digital signature of the SHA256 hashed data
     *
     * @throws if a key does not exist for the level or if the challenge is incorrect
     */
    signData(options: SignDataOptions): Promise<string | Signature>;

    /**
     * Returns the public key for provided a key level
     *
     * @param {GetKeyOptions} options - Options for retrieving the key
     * @returns {Promise<PublicKey>} The public key
     *
     * @throws If a key does not exist for the level
     */
    getKey(options: GetKeyOptions): Promise<PublicKey>;

    /**
     * Checks the key against the provided challenge
     *
     * @param {CheckKeyOptions} options - options for checking the key challenge
     * @returns {Promise<boolean>} - returns matching status
     *
     * @throws if challenge is not provided
     */
    checkKey(options: CheckKeyOptions): Promise<boolean>;

    /**
     * Removes a key for the provided level
     *
     * @param {GetKeyOptions} options - Options for removing a key
     * @throws if a key does not exist for the level
     */
    removeKey(options: GetKeyOptions): Promise<void>;
}

export { KeyManager, KeyManagerLevel, StoreKeyOptions, SignDataOptions, GetKeyOptions, CheckKeyOptions };
