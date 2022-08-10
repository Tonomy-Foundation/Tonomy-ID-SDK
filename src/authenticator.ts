import { PrivateKey, PublicKey } from '@greymass/eosio';

enum AuthenticatorLevel { Password, PIN, Fingerprint, Local };

interface Authenticator {
    // TODO: turn each of the inputs into objects...

    /**
     * Stores a private key that can be used later for signing.
     *
     * @remarks
     * Once a private key is stored, it may no longer be accessible.
     *
     * @param level - The security level of the key
     * @param privateKey - The private key to be stored
     * @param [challenge] - A challenge that needs to be presented in order for the key to be used
     * @returns The PublicKey
     */
    storeKey(level: AuthenticatorLevel, privateKey: PrivateKey, challenge?: string): PublicKey

    /**
     * Signs the hash of data with a stored private key
     *
     * @param level - The security level of the key
     * @param data - The data that will be used to create a digital signature
     * @param [challenge] - A challenge that needs to be presented in order for the key to be used
     * @returns A digital signature of the SHA256 hashed data
     */
    signData(level: AuthenticatorLevel, data: string | Uint8Array, challenge?: string): string

    /**
     * Returns the public key of a stored private key
     *
     * @param level - The security level of the key
     * @returns The PublicKey
     */
    getKey(level: AuthenticatorLevel): PublicKey
}

class JsAuthenticator implements Authenticator {
    storeKey(level: AuthenticatorLevel, privateKey: PrivateKey, challenge: string): PublicKey {
        return PublicKey.from("");
    }

    signData(level: AuthenticatorLevel, data: string | Uint8Array, challenge?: string): string {
        return "";
    }

    getKey(level: AuthenticatorLevel): PublicKey {
        return PublicKey.from("");
    }
}

export { Authenticator, AuthenticatorLevel, JsAuthenticator }