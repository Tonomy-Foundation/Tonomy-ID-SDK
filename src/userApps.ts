/* eslint-disable camelcase */
import { Name, PublicKey } from '@greymass/eosio';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { createVCSigner } from './util/crypto';
import { User } from './user';
import { createKeyManagerSigner } from './services/eosio/transaction';
import { SdkErrors, throwError } from './services/errors';
import { createJWK, toDid } from './util/did-jwk';
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

    static async signMessage(
        message: any,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE,
        recipient?: string
    ): Promise<Message> {
        const publicKey = await keyManager.getKey({
            level: keyManagerLevel,
        });

        if (!publicKey) throw throwError('No Key Found for this level', SdkErrors.KeyNotFound);
        const signer = createVCSigner(keyManager, keyManagerLevel).sign;

        const jwk = await createJWK(publicKey);

        const issuer = toDid(jwk);

        return await Message.sign(message, { did: issuer, signer: signer as any, alg: 'ES256K-R' }, recipient);
    }

    /**
     * gets parameters from URL and verify the requests coming from the app
     * @returns the verified results, accountName and username
     */
    static async onAppRedirectVerifyRequests() {
        const params = new URLSearchParams(window.location.search);
        const requests = params.get('requests');

        if (!requests) throwError("requests parameter doesn't exists", SdkErrors.MissingParams);
        const username = params.get('username');

        if (!username) throwError("username parameter doesn't exists", SdkErrors.MissingParams);
        const accountName = params.get('accountName');

        if (!accountName) throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
        const result = await UserApps.verifyRequests(requests);

        return { result, username, accountName };
    }

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

    static async onRedirectLogin(): Promise<Message> {
        const urlParams = new URLSearchParams(window.location.search);
        const requests = urlParams.get('requests');

        const verifiedRequests = await this.verifyRequests(requests);

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

    static async verifyLoginJWT(jwt: string): Promise<Message> {
        const message = new Message(jwt);
        const res = await message.verify();

        if (!res) throwError('JWT failed verification', SdkErrors.JwtNotValid);
        return message;
    }

    static async verifyKeyExistsForApp(
        accountName: string,
        keyManager: KeyManager,
        keyManagerLevel: KeyManagerLevel = KeyManagerLevel.BROWSER_LOCAL_STORAGE
    ): Promise<boolean> {
        const pubKey = await keyManager.getKey({
            level: keyManagerLevel,
        });
        const user = await User.getAccountInfo(Name.from(accountName));
        const app = await App.getApp(window.location.origin);
        const publickey = user.getPermission(app.accountName).required_auth.keys[0].key;

        if (!pubKey) throwError("Couldn't fetch Key", SdkErrors.KeyNotFound);

        return pubKey.toString() === publickey.toString();
    }
}
