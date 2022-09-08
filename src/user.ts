import { KeyManager, KeyManagerLevel } from './keymanager';
import { IDContract, GetAccountTonomyIDInfoResponse } from './services/contracts/IDContract';
import { Name, PrivateKey, API, Checksum256 } from '@greymass/eosio';
import { sha256 } from './util/crypto';
import { createKeyManagerSigner, createSigner } from './services/eosio/transaction';
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

    async savePassword(masterPassword: string, options?: { salt?: Checksum256 }) {
        let privateKey: PrivateKey
        let salt: Checksum256;
        if (options && options.salt) {
            salt = options.salt;
            const res = await this.keyManager.generatePrivateKeyFromPassword(masterPassword, salt);
            privateKey = res.privateKey;
        } else {
            const res = await this.keyManager.generatePrivateKeyFromPassword(masterPassword);
            privateKey = res.privateKey;
            salt = res.salt;
        }

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

        const signer = createKeyManagerSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        await idContract.updatekeys(this.accountName.toString(), keys, signer);
    }

    async login(username: string, password: string): Promise<GetAccountTonomyIDInfoResponse> {
        const keyManager = this.keyManager;

        const idData = await idContract.getAccountTonomyIDInfo(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { salt });
        const passwordKey = keyManager.getKey({ level: KeyManagerLevel.PASSWORD });

        const accountData = await User.getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (!passwordKey.equals(onchainKey)) throw new Error("Password is incorrect");

        this.accountName = Name.from(idData.account_name);
        this.username = username;
        return idData;
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