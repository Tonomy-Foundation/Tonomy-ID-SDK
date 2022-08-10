import { PrivateKey, PublicKey, Checksum256, Signature } from '@greymass/eosio';
import crypto from 'crypto';

enum AuthenticatorLevel { Password, PIN, Fingerprint, Local };

/**
 * @param level - The security level of the key
 * @param privateKey - The private key to be stored
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
type StoreKeyOptions = {
    level: AuthenticatorLevel;
    privateKey: PrivateKey;
    challenge?: string;
}

/**
 * @param level - The security level of the key
 * @param data - The data that will be used to create a digital signature
 * @param [challenge] - A challenge that needs to be presented in order for the key to be used
 */
type SignDataOptions = {
    level: AuthenticatorLevel;
    data: string | Uint8Array;
    challenge?: string
}

/**
 * @param level - The security level of the key
 */
type GetKeyOptions = {
    level: AuthenticatorLevel;
}

interface Authenticator {
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

class JsAuthenticator implements Authenticator {
    // TODO: use localStorage or sessionStorage in browser if available instead of keyStorage
    keyStorage: {
        [key in AuthenticatorLevel]: KeyStorage;
    }

    async storeKey(options: StoreKeyOptions): Promise<PublicKey> {
        const keyStore: KeyStorage = {
            privateKey: options.privateKey,
            publicKey: options.privateKey.toPublic()
        }

        if (options.level === AuthenticatorLevel.Password || options.level === AuthenticatorLevel.PIN) {
            if (!options.challenge) throw new Error("Challenge missing");

            keyStore.salt = crypto.randomBytes(32).toString('hex');
            keyStore.hashedSaltedChallenge = Checksum256.hash(options.challenge + keyStore.salt).toString();
        }

        this.keyStorage[options.level] = keyStore;
        return keyStore.publicKey;
    }

    async signData(options: SignDataOptions): Promise<string | Signature> {
        if (options.level in this.keyStorage) throw new Error("No key for this level");

        const keyStore = this.keyStorage[options.level];

        if (options.level === AuthenticatorLevel.Password || options.level === AuthenticatorLevel.PIN) {
            if (!options.challenge) throw new Error("Challenge missing");

            const hashedSaltedChallenge = Checksum256.hash(options.challenge + keyStore.salt).toString();

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

export { Authenticator, AuthenticatorLevel, JsAuthenticator }