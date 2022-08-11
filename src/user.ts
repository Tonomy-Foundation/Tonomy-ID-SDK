import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/IDContract';
import { Name, PrivateKey } from '@greymass/eosio';
import * as argon2 from "argon2";


class User {
    authenticator: Authenticator;
    id: IDContract; // TODO: turn into a singleton

    salt: Buffer;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
        this.id = new IDContract();
    }

    createAccount(accountName: string, masterPassword: string) {
        const { privateKey, salt } = this.generatePrivateKeyFromPassword(masterPassword);
        const level = AuthenticatorLevel.Password;
        this.authenticator.storeKey({ level, privateKey, challenge: masterPassword }).then((passwordPublicKey) => {
            this.id.create(accountName, passwordPublicKey, salt);
        });


    }


    async generatePrivateKeyFromPassword(password: string) {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        const salt = Buffer.from('123123')
        const privateKey = await argon2.hash(password, { salt })

        return {
            privateKey: privateKey,
            salt
        }
    }

    async savePassword(masterPassword: string) {
        const { privateKey, salt } = await this.generatePrivateKeyFromPassword(masterPassword);
        this.salt = salt;
        const level = AuthenticatorLevel.Password;
        this.authenticator.storeKey({ level, privateKey, challenge: masterPassword });
    }
}

export { User };