/* eslint-disable camelcase */
import { PublicKey } from '@greymass/eosio';
import { ES256KSigner, createJWT, verifyJWT, JWTVerified } from 'did-jwt';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { User } from './user';
import { createKeyManagerSigner } from './services/eosio/transaction';
import { SdkErrors, throwError } from './services/errors';
import { createJWK, resolve, toDid } from './util/did-jwk';
import { getSettings } from './settings';
import { App, AppStatus } from './app';

const idContract = IDContract.Instance;

type UserAppRecord = {
    app: App;
    added: Date;
    status: AppStatus;
};

type UserAppStorage = {
    appRecords: UserAppRecord[];
};

// TODO change to use VC
type JWTLoginPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};

type OnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
};

export default class UserApps {
    user: User;
    keyManager: KeyManager;
    storage: UserAppStorage & PersistentStorageClean;

    constructor(_user: User, _keyManager: KeyManager, storageFactory: StorageFactory) {
        this.user = _user;
        this.keyManager = _keyManager;
        this.storage = createStorage<UserAppStorage>('tonomy.user.apps.', storageFactory);
    }

    async loginWithApp(app: App, key: PublicKey, password: string): Promise<void> {
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

        const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.PASSWORD, password);
        await idContract.loginwithapp(myAccount.toString(), app.accountName.toString(), key, signer);

        appRecord.status = AppStatus.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    static async onPressLogin({ redirect = true, callbackPath }: OnPressLoginOptions): Promise<string | void> {
        const { privateKey, publicKey } = generateRandomKeyPair();
        const payload: JWTLoginPayload = {
            randomString: randomString(32),
            origin: window.location.origin,
            publicKey: publicKey.toString(),
            callbackPath,
        };

        // TODO store the signer key in localStorage
        const signer = ES256KSigner(privateKey.data.array, true);

        const jwk = await createJWK(publicKey);

        const issuer = toDid(jwk);

        // TODO use expiresIn to make JWT expire after 5 minutes
        const token = await createJWT(payload, { issuer, signer, alg: 'ES256K-R' });

        if (redirect) {
            window.location.href = `${getSettings().ssoWebsiteOrigin}/login?jwt=${token}`;
            return;
        }
        return token;
    }

    static async onRedirectLogin(): Promise<JWTVerified> {
        const urlParams = new URLSearchParams(window.location.search);
        const jwt = urlParams.get('jwt');
        if (!jwt) throwError('No JWT found in URL', SdkErrors.MissingParams);

        const verified = await this.verifyLoginJWT(jwt);
        const payload = verified.payload as JWTLoginPayload;

        const referrer = new URL(document.referrer);
        if (payload.origin !== referrer.origin) {
            throwError(
                `JWT origin: ${payload.origin} does not match referrer: ${document.referrer}`,
                SdkErrors.WrongOrigin
            );
        }
        return verified;
    }

    static async verifyLoginJWT(jwt: string): Promise<JWTVerified> {
        const resolver: any = {
            resolve,
            // TODO add Antelope resolver as well
        };
        const res = await verifyJWT(jwt, { resolver });

        if (!res.verified) throwError('JWT failed verification', SdkErrors.JwtNotValid);
        return res;
    }
}

export { UserApps, JWTLoginPayload, AppStatus };
