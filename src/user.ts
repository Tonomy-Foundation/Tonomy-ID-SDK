
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

export { User };