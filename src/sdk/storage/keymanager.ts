import { Checksum256, PrivateKey, PublicKey, Signature } from '@wharfkit/antelope';
import { SdkErrors, throwError } from '../util';

enum KeyManagerLevel {
    PASSWORD = 'PASSWORD',
    ACTIVE = 'ACTIVE',
    PIN = 'PIN',
    BIOMETRIC = 'BIOMETRIC',
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

    export function validate(value: KeyManagerLevel): void {
        if (KeyManagerLevel.indexFor(value) === -1) {
            throw new Error(`${SdkErrors.InvalidKeyLevel}: Invalid level`);
        }
    }
}

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {PrivateKey} privateKey - The private key to be stored
 * @param {string} [challenge] - A challenge that needs to be presented in order for the key to be used
 */
class StoreKeyOptions {
    level: KeyManagerLevel;
    privateKey: PrivateKey;
    challenge?: string;

    static validate(options: StoreKeyOptions): void {
        KeyManagerLevel.validate(options.level); // throws if level not valid

        if (options.challenge !== undefined) {
            if (typeof options.challenge !== 'string' || options.challenge.length === 0) {
                throwError('Invalid challenge', SdkErrors.InvalidChallenge);
            }
        }
    }
}

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {string | Checksum256} data - The data that will be used to create a digital signature
 * @param {string} [challenge] - A challenge that needs to be presented in order for the key to be used
 * @param {'jwt' | 'transaction'} [outputType] - The type of output to return
 */
class SignDataOptions {
    level: KeyManagerLevel;
    data: string | Checksum256;
    challenge?: string;
    outputType?: 'jwt' | 'transaction';

    static validate(options: SignDataOptions): void {
        KeyManagerLevel.validate(options.level); // throws if level not valid

        if (options.challenge !== undefined) {
            if (typeof options.challenge !== 'string' || options.challenge.length === 0) {
                throwError('Invalid challenge', SdkErrors.InvalidChallenge);
            }
        }

        if (options.outputType) {
            if (options.outputType !== 'jwt' && options.outputType !== 'transaction') {
                throwError('Invalid output type', SdkErrors.InvalidData);
            }
        }
    }
}

/**
 * @param {KeyManagerLevel} level - The security level of the key
 */
class GetKeyOptions {
    level: KeyManagerLevel;

    static validate(options: GetKeyOptions): void {
        KeyManagerLevel.validate(options.level); // throws if level not valid
    }
}

/**
 * @param {KeyManagerLevel} level - The security level of the key
 * @param {string} challenge - the challenge to check
 */
class CheckKeyOptions {
    level: KeyManagerLevel;
    challenge: string;

    static validate(options: CheckKeyOptions): void {
        KeyManagerLevel.validate(options.level); // throws if level not valid

        if (options.challenge !== undefined) {
            if (typeof options.challenge !== 'string' || options.challenge.length === 0) {
                throwError('Invalid challenge', SdkErrors.InvalidChallenge);
            }
        }
    }
}

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
     * @throws if challenge is not provided, or if key is not found
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

export { KeyManagerLevel, StoreKeyOptions, SignDataOptions, GetKeyOptions, CheckKeyOptions };
export type { KeyManager };
