import { PrivateKey, PublicKey, Checksum256, Signature } from '@greymass/eosio';
import { randomString, sha256 } from './util/crypto';

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
    data: string | Uint8Array;
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
    getKey(options: GetKeyOptions): PublicKey
}

type KeyStorage = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    // TODO: check that this complies with the eosio checksum256 format
    hashedSaltedChallenge?: string;
    salt?: string;
}

class JsKeyManager implements KeyManager {
    // TODO: use localStorage or sessionStorage in browser if available instead of keyStorage
    keyStorage: {
        [key in KeyManagerLevel]: KeyStorage;
    }




    // creates a new secure key and returns the public key
    async storeKey(options: StoreKeyOptions): Promise<PublicKey> {
        const keyStore: KeyStorage = {
            privateKey: options.privateKey,
            publicKey: options.privateKey.toPublic()
        }

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throw new Error("Challenge missing");

            keyStore.salt = randomString(32);
            keyStore.hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);
        }

        this.keyStorage[options.level] = keyStore;
        return keyStore.publicKey;
    }

    async signData(options: SignDataOptions): Promise<string | Signature> {
        if (options.level in this.keyStorage) throw new Error("No key for this level");

        const keyStore = this.keyStorage[options.level];

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throw new Error("Challenge missing");

            const hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);

            if (keyStore.hashedSaltedChallenge !== hashedSaltedChallenge) throw new Error("Challenge does not match");
        }

        const privateKey = keyStore.privateKey;
        const hash = Checksum256.hash(options.data);
        const signature = privateKey.signDigest(hash)

        return signature;
    }

    getKey(options: GetKeyOptions): PublicKey {
        if (options.level in this.keyStorage) throw new Error("No key for this level");

        const keyStore = this.keyStorage[options.level];
        return keyStore.publicKey;
    }
}

export { KeyManager, KeyManagerLevel, JsKeyManager }