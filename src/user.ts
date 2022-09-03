import { KeyManager, KeyManagerLevel } from './keymanager';
import { IDContract } from './services/contracts/IDContract';
import { Name, PrivateKey, KeyType, Bytes, API } from '@greymass/eosio';
import { createSigner } from './services/eosio/transaction';

import { randomBytes, randomString, sha256 } from './util/crypto';
import scrypt from "scrypt-js";
import { api } from './services/eosio/eosio';


const idContract = IDContract.Instance;

class User {
    keyManager: KeyManager;

    salt: Buffer;
    username: string;
    accountName: Name;

    constructor(_keyManager: KeyManager) {
        this.keyManager = _keyManager;
    }

    async createPerson(username: string) {
        const usernameHash = sha256(username);

        // const passwordKey = this.authenticator.getKey({ level: AuthenticatorLevel.Password });
        // const pinKey = this.authenticator.getKey({ level: AuthenticatorLevel.PIN });
        // const fingerprintKey = this.authenticator.getKey({ level: AuthenticatorLevel.Fingerprint });
        // const localKey = this.authenticator.getKey({ level: AuthenticatorLevel.Local });
        const passwordKey = PrivateKey.generate(KeyType.K1);
        const passwordSalt = randomString(32);
        const pinKey = PrivateKey.generate(KeyType.K1);
        const fingerprintKey = PrivateKey.generate(KeyType.K1);
        const localKey = PrivateKey.generate(KeyType.K1);

        // TODO this needs to change to the actual key used, from settings
        const idTonomyActiveKey = PrivateKey.from("PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V");

        const res = await idContract.newperson(usernameHash.toString(), passwordKey.toPublic().toString(), passwordSalt.toString(), createSigner(idTonomyActiveKey));

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
        this.accountName = Name.from(newAccountAction.data.name);
        this.username = username;

        // TODO:
        // use status to lock the account till finished craeating

        await idContract.updatekeys(this.accountName.toString(), {
            PIN: pinKey.toPublic().toString(),
            FINGERPRINT: fingerprintKey.toPublic().toString(),
            LOCAL: localKey.toPublic().toString()
        }, createSigner(passwordKey));
    }

    async generatePrivateKeyFromPassword(password: string): Promise<{ privateKey: PrivateKey, salt: Buffer }> {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        const salt = randomBytes(32);

        const hash = await this.scryptHash(password, salt);
        const newBytes = Buffer.from(hash)
        const privateKey = new PrivateKey(KeyType.K1, new Bytes(newBytes));

        return {
            privateKey,
            salt
        }
    }

    private scryptHash(password: string, salt: Buffer): Promise<Uint8Array> {

        const passwordBuffer = Buffer.from(password);
        return scrypt.scrypt(passwordBuffer, salt, 16384, 8, 1, 64);
    }
    /**
     * 
     * @param password password to verify
     * @param salt   salt to use for verification
     * @param hash  hash to use for verification
     * @returns true if password is correct
     */
    public async scryptVerify(password: string, salt: Buffer, hash: Uint8Array): Promise<boolean> {

        const hashedPassword = await this.scryptHash(password, salt);
        return Buffer.compare(hashedPassword, hash) === 0;
    }

    async savePassword(masterPassword: string) {
        const { privateKey, salt } = await this.generatePrivateKeyFromPassword(masterPassword);
        this.salt = salt;
        const level = KeyManagerLevel.PASSWORD;
        this.keyManager.storeKey({ level, privateKey, challenge: masterPassword });
    }
    static async getAccountInfo(account: string | Name): Promise<API.v1.AccountObject> {
        if (typeof account === 'string') {
            // this is a username
            const idData = await idContract.getAccountTonomyIDInfo(account);
            return await api.v1.chain.get_account(idData.account_name);
        } else {
            // use the account name directly
            return await api.v1.chain.get_account(account);
        }
    }
    // Creates a cryptographically secure Private key
    generateRandomPrivateKey(): PrivateKey {
        const randomString = randomBytes(32);
        return new PrivateKey(KeyType.K1, new Bytes(randomString));
    };
}

export { User };