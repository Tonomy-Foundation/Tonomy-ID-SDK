import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/IDContract';
import { Name } from '@greymass/eosio';
import { publicKey } from './services/eosio/eosio';

const idContract = IDContract.Instance;

class User {
    authenticator: Authenticator;

    salt: string;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
    }

    async createPerson(username: string) {
        // TODO
        // hash the username
        // retreive public key for password, pin and fingerprint from the Authenticator

        let res = await idContract.newperson("id.tonomy", "7d32c90f59b2131f86132a30172a8adbb3e839110e38874901afc61d971d7d0e",
            publicKey.toString(), "b9776d7ddf459c9ad5b0e1d6ac61e27befb5e99fd62446677600d7cacef544d0",
            publicKey.toString(), publicKey.toString());

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;
        if (newAccountAction.name !== "newaccount") throw new Error("Expected newaccount action to be called");

        this.accountName = Name.from(newAccountAction.data.name);
        this.username = username;
        res = await idContract.updateperson(this.accountName.toString(), "active", "owner", publicKey.toString());
        // res = await idContract.updateauth(this.accountName.toString(), "active", "owner", publicKey.toString());
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