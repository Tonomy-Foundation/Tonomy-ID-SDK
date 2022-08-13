import { Authenticator, AuthenticatorLevel } from './authenticator';
import { IDContract } from './services/IDContract';
import { Name, PrivateKey } from '@greymass/eosio';

const idContract = IDContract.Instance;

class User {
    authenticator: Authenticator;

    salt: string;
    username: string;
    accountName: Name;

    constructor(_authenticator: Authenticator) {
        this.authenticator = _authenticator;
    }

    async createPerson(userName: string) {
        // TODO
        // hash the username
        // retreive public key for password, pin and fingerprint from the Authenticator

        const res = await idContract.newperson("id.tonomy", "7d32c90f59b2131f86132a30172a8adbb3e839110e38874901afc61d971d7d0e",
            "PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63", "b9776d7ddf459c9ad5b0e1d6ac61e27befb5e99fd62446677600d7cacef544d0",
            "PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63", "PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63");

        // add the username to the object
        // add the account name to the object
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