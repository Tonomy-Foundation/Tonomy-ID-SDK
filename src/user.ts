import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/IDContract';
import { Bytes, KeyType, Name, PrivateKey } from '@greymass/eosio';
import * as argon2 from "argon2";
import crypto from 'crypto';

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
        console.log(accountName, masterPassword);
    }


    async generatePrivateKeyFromPassword(password: string): Promise<{ privateKey: PrivateKey, salt: Buffer }> {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        const randomString = crypto.randomBytes(32).toString('hex')
        const salt = Buffer.from(randomString)
        const hash = await argon2.hash(password, { salt })
        const privateKey = new PrivateKey(KeyType.K1, new Bytes(Buffer.from(hash, 'hex')));

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

    // Creates a cryptographically secure Private key
    async generateRandoPrivateKey(): Promise<{ privateKey: PrivateKey, salt: Buffer }> {
        const randomString = crypto.randomBytes(32).toString('hex')
        const { privateKey, salt } = await this.generatePrivateKeyFromPassword(randomString)
        return { privateKey, salt };
    };
}


export { User };