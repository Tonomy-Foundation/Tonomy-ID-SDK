import { PrivateKey, PublicKey } from '@greymass/eosio';

enum AuthenticatorLevel { Password, PIN, Fingerprint, Local };

interface Authenticator {
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
}

class JsAuthenticator implements Authenticator {
    storeKey(level: AuthenticatorLevel, privateKey: PrivateKey, challenge: string): PublicKey {
        return "string";
    }
}

export { Authenticator, AuthenticatorLevel, JsAuthenticator }