import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Checksum256, Name, PrivateKey } from '@greymass/eosio';
import { publicKey } from './services/eosio/eosio';
import { Authority } from './services/eosio/authority';
import { EosioContract } from './services/contracts/EosioContract';

const idContract = IDContract.Instance;
const eosioContract = EosioContract.Instance;

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

    // #### Creating account flow ####

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

    // #### Login and logout flow ####

    // Checks that master password is correct and if so loads any account details
    login(username: string, masterPassword: string): Promise<void>;

    // Removes any keys from the authenticator and any instance variables of User
    logout(): Promise<void>;
};

interface PublicSdk {
    login(): Promise<void>;
    signTransaction(): Promise<void>;
    // NOTE: need to use public SDK to send transaction to wallet

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
        // const usernameHash = Checksum256.hash(username);

        // const passwordKey = this.authenticator.getKey({ level: AuthenticatorLevel.Password });
        // const pinKey = this.authenticator.getKey({ level: AuthenticatorLevel.PIN });
        // const fingerprintKey = this.authenticator.getKey({ level: AuthenticatorLevel.Fingerprint });
        const passwordKey = PrivateKey.generate("random1");
        const pinKey = PrivateKey.generate("random2");
        const fingerprintKey = PrivateKey.generate("random2");

        const res = await idContract.newperson("id.tonomy", "7d32c90f59b2131f86132a30172a8adbb3e839110e38874901afc61d971d7d0e",
            passwordKey.toPublic().toString(), "b9776d7ddf459c9ad5b0e1d6ac61e27befb5e99fd62446677600d7cacef544d0",
            pinKey.toPublic().toString(), fingerprintKey.toPublic().toString());
        // const res = await idContract.newperson("id.tonomy", usernameHash.toString(),
        //     passwordKey.toString(), this.salt,
        //     pinKey.toString(), fingerprintKey.toString());

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
        this.accountName = Name.from(newAccountAction.data.name);
        this.username = username;

        // TODO:
        // update key with fingerprint
        // may need to do this in separate action, or perhaps separate transaction... need to test
        // may need to use status to lock the account till finished craeating

        console.log("updating with updateperson");
        await idContract.updateperson(this.accountName.toString(), "active", "owner", publicKey.toString());
    }

    // Updates the existing password in the Authenticator
    // Probably needs to prompt user for the current password to do this
    async updatePassword(newMasterPassword: string)

    generatePrivateKeyFromPassword(password: string) {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        return {
            privateKey: 'xxxx',
            salt: 'yyyy'
        }
    }
}

export { User };