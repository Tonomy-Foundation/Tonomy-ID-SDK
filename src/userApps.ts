/* eslint-disable camelcase */
import { PublicKey } from '@greymass/eosio';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { User } from './user';
import { createKeyManagerSigner } from './services/eosio/transaction';
import { SdkErrors, throwError } from './services/errors';
import { App, AppStatus } from './app';
import { Message } from './util/message';

const idContract = IDContract.Instance;

export type UserAppRecord = {
    app: App;
    added: Date;
    status: AppStatus;
};

export type UserAppStorage = {
    appRecords: UserAppRecord[];
};

// TODO change to use VC
export type JWTLoginPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};

export type OnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
};

export class UserApps {
    user: User;
    keyManager: KeyManager;
    storage: UserAppStorage & PersistentStorageClean;

    constructor(_user: User, _keyManager: KeyManager, storageFactory: StorageFactory) {
        this.user = _user;
        this.keyManager = _keyManager;
        this.storage = createStorage<UserAppStorage>('tonomy.user.apps.', storageFactory);
    }

    async loginWithApp(app: App, key: PublicKey): Promise<void> {
        const myAccount = await this.user.storage.accountName;

        const appRecord: UserAppRecord = {
            app,
            added: new Date(),
            status: AppStatus.PENDING,
        };

        let apps = await this.storage.appRecords;

        if (!apps) {
            apps = [];
        }

        apps.push(appRecord);
        this.storage.appRecords = apps;
        await this.storage.appRecords;

        const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.LOCAL);

        await idContract.loginwithapp(myAccount.toString(), app.accountName.toString(), 'local', key, signer);

        appRecord.status = AppStatus.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    /**
     * Verifies the login request are valid requests signed by valid DIDs
     *
     * @param requests {string | null} - a stringified array of JWTs
     * @returns {Promise<Message[]>} - an array of verified messages containing the login requests
     */
    static async verifyRequests(requests: string | null): Promise<Message[]> {
        if (!requests) throwError('No requests found in URL', SdkErrors.MissingParams);

        const jwtRequests = JSON.parse(requests);

        if (!jwtRequests || !Array.isArray(jwtRequests) || jwtRequests.length === 0) {
            throwError('No JWTs found in URL', SdkErrors.MissingParams);
        }

        const verified: Message[] = [];

        for (const jwt of jwtRequests) {
            verified.push(await this.verifyLoginJWT(jwt));
        }

        return verified;
    }

    /**
     * Verifies the login request received in the URL were successfully authorized by Tonomy ID
     *
     * @description should be called in the callback page of the external website
     *
     * @returns {Promise<Message>} - the verified login request
     */
    static async onRedirectLogin(): Promise<Message> {
        const urlParams = new URLSearchParams(window.location.search);
        const requests = urlParams.get('requests');

        const verifiedRequests = await UserApps.verifyRequests(requests);

        const referrer = new URL(document.referrer);

        for (const message of verifiedRequests) {
            if (message.getPayload().origin === referrer.origin) {
                return message;
            }
        }

        throwError(
            `No origins from: ${verifiedRequests.map((r) => r.getPayload().origin)} match referrer: ${referrer.origin}`,
            SdkErrors.WrongOrigin
        );
    }

    /**
     * Verifies a jwt string is a valid message with signature from a DID
     * @param jwt {string} - the jwt string to verify
     * @returns {Promise<Message>} - the verified message
     */
    static async verifyLoginJWT(jwt: string): Promise<Message> {
        const message = new Message(jwt);
        const res = await message.verify();

        // TODO should check the keys in KeyManager are on the blockchain...

        if (!res) throwError('JWT failed verification', SdkErrors.JwtNotValid);
        return message;
    }
}
