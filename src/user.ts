import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Bytes, KeyType, Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { randomBytes, sha256 } from './util/crypto';
import { createAuthenticatorSigner, createSigner } from './services/eosio/transaction';
import argon2 from 'argon2';
import { api } from './services/eosio/eosio';

const idContract = IDContract.Instance;

class User {
    authenticator: Authenticator;

    salt: Checksum256;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
    }

    async savePassword(masterPassword: string) {
        const { privateKey, salt } = await this.generatePrivateKeyFromPassword(masterPassword);
        this.salt = salt;
        this.authenticator.storeKey({ level: AuthenticatorLevel.PASSWORD, privateKey, challenge: masterPassword });
    }

    async savePIN(pin: string) {
        const privateKey = this.generateRandomPrivateKey();
        this.authenticator.storeKey({ level: AuthenticatorLevel.PIN, privateKey, challenge: pin });
    }

    async saveFingerprint() {
        const privateKey = this.generateRandomPrivateKey();
        this.authenticator.storeKey({ level: AuthenticatorLevel.FINGERPRINT, privateKey });
    }

    async saveLocal() {
        const privateKey = this.generateRandomPrivateKey();
        this.authenticator.storeKey({ level: AuthenticatorLevel.LOCAL, privateKey });
    };

    async createPerson(username: string, password: string) {
        const authenticator = this.authenticator;

        const usernameHash = sha256(username);

        // TODO check password is correct?
        const passwordKey = authenticator.getKey({ level: AuthenticatorLevel.PASSWORD });
        const pinKey = authenticator.getKey({ level: AuthenticatorLevel.PIN });
        const fingerprintKey = authenticator.getKey({ level: AuthenticatorLevel.FINGERPRINT });
        const localKey = authenticator.getKey({ level: AuthenticatorLevel.LOCAL });

        // TODO this needs to change to the actual key used, from settings
        const idTonomyActiveKey = PrivateKey.from("PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V");

        // TODO need to remove sha256 from this.salt
        const res = await idContract.newperson(usernameHash.toString(), passwordKey.toString(), this.salt.toString(), createSigner(idTonomyActiveKey));

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
        this.accountName = Name.from(newAccountAction.data.name);
        this.username = username;

        // TODO:
        // use status to lock the account till finished craeating

        const keys: any = {};
        if (pinKey) keys.PIN = pinKey.toString();
        if (fingerprintKey) keys.FINGERPRINT = fingerprintKey.toString();
        if (localKey) keys.LOCAL = localKey.toString();

        const signer = createAuthenticatorSigner(authenticator, AuthenticatorLevel.PASSWORD, password);
        await idContract.updatekeys(this.accountName.toString(), keys, signer);
    }

    async generatePrivateKeyFromPassword(password: string): Promise<{ privateKey: PrivateKey, salt: Checksum256 }> {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        const salt = Checksum256.from(randomBytes(32));
        const hash = await argon2.hash(password, { salt: Buffer.from(salt.toString()) })
        const newBytes = Buffer.from(hash);
        const privateKey = new PrivateKey(KeyType.K1, new Bytes(newBytes));

        return {
            privateKey,
            salt
        }
    }

    // Creates a cryptographically secure Private key
    generateRandomPrivateKey(): PrivateKey {
        const randomString = randomBytes(32);
        return new PrivateKey(KeyType.K1, new Bytes(randomString));
    };


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
}

export { User };