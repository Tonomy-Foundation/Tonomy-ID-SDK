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
        const salt = crypto.randomBytes(32)
        const hash = await argon2.hash(password, { salt })
        const newBytes = Buffer.from(hash)
        const privateKey = new PrivateKey(KeyType.K1, new Bytes(newBytes));

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
    generateRandomPrivateKey(): PrivateKey {
        const randomString = crypto.randomBytes(32)
        return new PrivateKey(KeyType.K1, new Bytes(randomString));
    };
}


export { User };