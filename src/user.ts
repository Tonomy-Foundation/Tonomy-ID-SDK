import { KeyManager, KeyManagerLevel } from './keymanager';
import { IDContract } from './services/contracts/IDContract';
import { Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { sha256 } from './util/crypto';
import { createAuthenticatorSigner, createSigner } from './services/eosio/transaction';
import { api } from './services/eosio/eosio';

const idContract = IDContract.Instance;
export class User {
    keyManager: KeyManager;

    salt: Checksum256;
    username: string;
    accountName: Name;

    constructor(_keyManager: KeyManager) {
        this.keyManager = _keyManager;
    }

    async savePassword(masterPassword: string) {
        const { privateKey, salt } = await this.keyManager.generatePrivateKeyFromPassword(masterPassword);
        this.salt = salt;
        this.keyManager.storeKey({ level: KeyManagerLevel.PASSWORD, privateKey, challenge: masterPassword });
    }

    async savePIN(pin: string) {
        const privateKey = this.keyManager.generateRandomPrivateKey();
        this.keyManager.storeKey({ level: KeyManagerLevel.PIN, privateKey, challenge: pin });
    }

    async saveFingerprint() {
        const privateKey = this.keyManager.generateRandomPrivateKey();
        this.keyManager.storeKey({ level: KeyManagerLevel.FINGERPRINT, privateKey });
    }

    async saveLocal() {
        const privateKey = this.keyManager.generateRandomPrivateKey();
        this.keyManager.storeKey({ level: KeyManagerLevel.LOCAL, privateKey });
    };

    async createPerson(username: string, password: string) {
        const keyManager = this.keyManager;

        const usernameHash = sha256(username);

        // TODO check password is correct?
        const passwordKey = keyManager.getKey({ level: KeyManagerLevel.PASSWORD });
        const pinKey = keyManager.getKey({ level: KeyManagerLevel.PIN });
        const fingerprintKey = keyManager.getKey({ level: KeyManagerLevel.FINGERPRINT });
        const localKey = keyManager.getKey({ level: KeyManagerLevel.LOCAL });

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

        const signer = createAuthenticatorSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        await idContract.updatekeys(this.accountName.toString(), keys, signer);
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
}