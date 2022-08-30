import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Bytes, Checksum256, KeyType, Name, PrivateKey, Signature } from '@greymass/eosio';
import { randomBytes, sha256 } from './util/crypto';
import { createAuthenticatorSigner, createSigner } from './services/eosio/transaction';
import argon2 from 'argon2';

const idContract = IDContract.Instance;

class User {
    authenticator: Authenticator;

    salt: Buffer;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
    }

    async createPerson(username: string) {
        const authenticator = this.authenticator;

        const usernameHash = sha256(username);

        const passwordKey = authenticator.getKey({ level: AuthenticatorLevel.PASSWORD });
        const pinKey = authenticator.getKey({ level: AuthenticatorLevel.PIN });
        const fingerprintKey = authenticator.getKey({ level: AuthenticatorLevel.FINGERPRINT });
        const localKey = authenticator.getKey({ level: AuthenticatorLevel.LOCAL });

        // TODO this needs to change to the actual key used, from settings
        const idTonomyActiveKey = PrivateKey.from("PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V");

        const res = await idContract.newperson(usernameHash.toString(), passwordKey.toString(), passwordSalt.toString(), createSigner(idTonomyActiveKey));

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
        this.accountName = Name.from(newAccountAction.data.name);
        this.username = username;

        // TODO:
        // use status to lock the account till finished craeating

        await idContract.updatekeys(this.accountName.toString(), {
            PIN: pinKey.toString(),
            FINGERPRINT: fingerprintKey.toString(),
            LOCAL: localKey.toString()
        }, createAuthenticatorSigner(authenticator, AuthenticatorLevel.PASSWORD));
    }

    async generatePrivateKeyFromPassword(password: string): Promise<{ privateKey: PrivateKey, salt: Buffer }> {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        const salt = randomBytes(32);
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
        const level = AuthenticatorLevel.PASSWORD;
        this.authenticator.storeKey({ level, privateKey, challenge: masterPassword });
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
    }

    // Creates a cryptographically secure Private key
    generateRandomPrivateKey(): PrivateKey {
        const randomString = randomBytes(32);
        return new PrivateKey(KeyType.K1, new Bytes(randomString));
    };

}

export { User };