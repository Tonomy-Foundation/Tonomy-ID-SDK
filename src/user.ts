import { Authenticator } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Name, PrivateKey, KeyType } from '@greymass/eosio';
import { createSigner } from './services/eosio/transaction';
import { randomString, sha256 } from './util/crypto';

const idContract = IDContract.Instance;

interface TransactionI {
    sign().send();
    // NOTE: need to use public SDK to send transaction to wallet        
}

interface CredentialsI {
    sign().send();
    verify();
}

interface RecoveryI {
    initialize({ username: string }[]): Promise<void>;
    putRecoveryBuddies({ username: string }[]): Promise<void>;
    recoveryBuddyNotification({ account: Name, username: string }): Promise<void>;
    getRecoveryBuddies(username: string): Promise<{ account: Name }[]>;
    // Sends transaction to recover, and message to the new app to notify them
    recoverBuddy(account: Name);
    recoveryNotification(from: Name);
}

interface UserI {
    authenticator: Authenticator;

    salt: string;
    username: string;
    accountName: Name;

    recovery: RecoveryI;
    transaction: TransactionI;
    credentials: CredentialsI;

    // Creates or updates the private key protected by the master password in the Authenticator
    // Probably needs to prompt user for the current password to do this
    putMasterPasswordKey(masterPassword: string): Promise<void>;

    // Creates or updates the private key protected by the PIN in the Authenticator
    // If key already exists then prompt for master password
    putPINKey(pin: string): Promise<void>;

    // Creates or updates the private key protected by the fingerprint in the Authenticator
    // If key already exists then prompt for master password
    putFingerprintKey(): Promise<void>;

    // Creates or updates the local private key in the Authenticator
    // If key already exists then prompt for master password
    putLocalKey(): Promise<void>;

    // Creates the new account with the provided username,
    // and the keys that are stored in the authenticator
    // with a random account name and salt
    // throws if no master password key exists in the authenticator
    createPerson(username: string): Promise<void>;

    // Checks that master password is correct and if so loads any account details
    login(username: string, masterPassword: string): Promise<void>;

    // Removes any keys from the authenticator and any instance variables of User
    logout(): Promise<void>;
};

interface PublicSdk {
    login(): Promise<void>;
    signTransaction(): Promise<void>;

    signCredential(): Promise<void>;
    signAndSendCredential(): Promise<void>;
}

class User {
    authenticator: Authenticator;

    salt: string;
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
            pin: pinKey.toPublic().toString(),
            fingerprint: fingerprintKey.toPublic().toString(),
            local: localKey.toPublic().toString()
        }, createSigner(passwordKey));
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