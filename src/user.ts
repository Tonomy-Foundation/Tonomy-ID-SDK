import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Bytes, KeyType, Name, PrivateKey } from '@greymass/eosio';
import { randomBytes, randomString, sha256 } from './util/crypto';
import { createSigner } from './services/eosio/transaction';
import scrypt from "scrypt-js";

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
        const passwordBuffer = Buffer.from(password);
        const hash = await scrypt.scrypt(passwordBuffer, salt, 16384, 8, 1, 64)
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

    // Creates a cryptographically secure Private key
    generateRandomPrivateKey(): PrivateKey {
        const randomString = randomBytes(32);
        return new PrivateKey(KeyType.K1, new Bytes(randomString));
    };

}

export { User };