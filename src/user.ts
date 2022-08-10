import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/IDContract';
import { Name } from '@greymass/eosio';

class User {
    authenticator: Authenticator;
    id: IDContract; // TODO: turn into a singleton

    salt: string;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
        this.id = new IDContract();
    }

    createAccount(accountName: string, masterPassword: string) {
        const { privateKey, salt } = this.generatePrivateKeyFromPassword(masterPassword);

        const passwordPublicKey = this.authenticator.storeKey(AuthenticatorLevel.Password, privateKey, masterPassword);

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