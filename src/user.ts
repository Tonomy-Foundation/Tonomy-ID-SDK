enum AuthenticatorLevel { Password, PIN, Fingerprint, Local };

interface Authenticator {
    // creates a new secure key and returns the public key
    createPermission(level: AuthenticatorLevel, privateKey: string, challenge: string): string
}

class User {
    authenticator: Authenticator;
    id: IDSmartContract;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
        this.id = new IDSmartContract();
    }

    createAccount(accountName: string, masterPassword: string) {
        const { privateKey, salt } = this.generatePrivateKeyFromPassword(masterPassword);

        const passwordPublicKey = this.authenticator.createPermission(AuthenticatorLevel.Password, privateKey, masterPassword);

        this.id.create(accountName, passwordPublicKey, salt);
    }

    generatePrivateKeyFromPassword(password: string) {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        return {
            privateKey: 'xxxx',
            salt: 'yyyy'
        }
    }
}

// wrapper class that has js interface to call the smart contract
class IDSmartContract {
    // calls the ID smart contract create() function to create the account
    create(accountName: string, passwordPublicKey: string, salt: string) {
        // creates the new account with the public key and account name,
        // and stores the salt on chain for later user to re-derive the private key with the password
    }
}

export default User;
export { Authenticator, AuthenticatorLevel };