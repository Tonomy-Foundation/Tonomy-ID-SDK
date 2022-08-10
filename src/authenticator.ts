import { PrivateKey, PublicKey } from '@greymass/eosio';

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
    storeKey(options: StoreKeyOptions): PublicKey

    /**
     * Signs the hash of data with a stored private key
     *
     * @param options - Options for signing data
     * @returns A digital signature of the SHA256 hashed data
     */
    signData(options: SignDataOptions): string

    /**
     * Returns the public key of a stored private key
     *
     * @param options - Options for retreiving the key
     * @returns The PublicKey
     */
    getKey(options: GetKeyOptions): PublicKey
}

class JsAuthenticator implements Authenticator {
    storeKey(options: StoreKeyOptions): PublicKey {
        return PublicKey.from("");
    }

    signData(options: SignDataOptions): string {
        return "";
    }

    getKey(options: GetKeyOptions): PublicKey {
        return PublicKey.from("");
    }
}

export { Authenticator, AuthenticatorLevel, JsAuthenticator }