import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/contracts/IDContract';
import { Name, PrivateKey, PublicKey } from '@greymass/eosio';
import { publicKey } from './services/eosio/eosio';
import { ActionData, PushTransactionResponse } from './services/eosio/transaction';

const idContract = IDContract.Instance;

interface TransactionI {
    // Signs a transaction with the appropriate key, and sends it to the blockchain
    // NOTE: to get the transaction to the wallet, use the Public SDK
    signAndBroadcast(contract: Name, actions: ActionData[], level: AuthenticatorLevel): Promise<PushTransactionResponse>;
}

interface CredentialsI {
    // Creates a new Verifiable Credential signed with the appropriate key
    sign(credential: VerifiableCredential<any>, level: AuthenticatorLevel): Promise<VerifiableCredentialSigned<any>>;

    // Verifies a Verifiable Credential has a valid proof
    verify(credential: VerifiableCredentialSigned<any>): Promise<boolean>;

    // Verifies a Verifiable Credential has a valid proof from the provided DID's verification method
    hasProofOf(didUrl: string, credential: VerifiableCredentialSigned<any>): Promise<boolean>;
}

type BuddyType = { account?: Name, username?: string };
type Buddies = {
    threshsold: number;
    buddies: [BuddyType];
}

interface RecoveryI {
    myBuddies: Buddies;
    buddyOf: [BuddyType];

    // Initialize the object, if the account is found to already have recovery setup
    initialize(buddies: Buddies): Promise<void>;

    // Sets up the account to be able to recovery their account with the given buddies
    // sends a notification to each buddy that they are a buddy
    putRecoveryBuddies(buddies: Buddies): Promise<void>;

    // retreives the recovery buddies of a provided account
    getRecoveryBuddies(buddy: BuddyType): Promise<Buddies>;

    // caled to inform the account that they are the recovery buddy of another account
    recoveryBuddyNotification(from: BuddyType): Promise<void>;

    // retreives the accounts that a provided account is able to recover
    getBuddiesOf(account: BuddyType): Promise<[BuddyType]>;

    // Sends transaction to confirm recovery
    // sends a notification to recovering account
    recoverBuddy(buddyToRecover: BuddyType, newMasterPasswordKey: PublicKey): Promise<void>;

    // called to inform the account that a recovery confirmation is made
    recoveryNotification(from: BuddyType): Promise<void>;

    // Sign in to your recovering account with your new password
    recoverAccount(username: string): Promise<void>;
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

interface PublicUserI {
    authenticator: Authenticator;

    // Logs into the web app
    // Redirects to the domain for login where user scans a QR code from Tonomy ID to sign in
    // promise resolves when they are redirected back
    login(fallbackPath: string): Promise<void>;

    // Sends a transaction to the wallet, which will sign and broadcast it
    signTransaction(contract: Name, actions: ActionData[], level: AuthenticatorLevel): Promise<void>;

    // Sends a credential to the wallet which will sign and return it
    signCredential(credential: VerifiableCredential<any>, level: AuthenticatorLevel): Promise<VerifiableCredentialSigned<any>>;
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

export { User, UserI };