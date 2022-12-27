/* eslint-disable camelcase */
import { Name, PrivateKey, PublicKey } from '@greymass/eosio';
import { ES256KSigner, createJWT, verifyJWT, JWTVerified } from 'did-jwt';
import { IDContract } from './services/contracts/IDContract';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { createStorage, PersistentStorageClean, StorageFactory } from './services/storage';
import { generateRandomKeyPair, randomString } from './util/crypto';
import { User } from './user';
import { createKeyManagerSigner, createSigner } from './services/eosio/transaction';
import { SdkErrors, throwError } from './services/errors';
import { createJWK, resolve, toDid } from './util/did-jwk';
import { getSettings } from './settings';
import { AccountType, TonomyUsername } from './services/username';
const idContract = IDContract.Instance;

enum AppStatus {
    PENDING = 'PENDING',
    CREATING = 'CREATING',
    READY = 'READY',
    DEACTIVATED = 'DEACTIVATED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace AppStatus {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: AppStatus): number {
        return Object.keys(AppStatus).indexOf(value);
    }

    /*
     * Creates an AppStatus from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): AppStatus {
        let index: number;
        if (typeof value !== 'number') {
            index = AppStatus.indexFor(value as AppStatus);
        } else {
            index = value;
        }
        return Object.values(AppStatus)[index] as AppStatus;
    }
}

type AppRecord = {
    account: string;
    added: Date;
    status: AppStatus;
};

type UserAppStorage = {
    apps: AppRecord[];
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

export type AppCreateOptions = {
    usernamePrefix: string;
    appName: string;
    description: string;
    logoUrl: string;
    origin: string;
    publicKey: PublicKey;
};

export default class App {
    user: User;
    keyManager: KeyManager;
    storage: UserAppStorage & PersistentStorageClean;

    constructor(_user: User, _keyManager: KeyManager, storageFactory: StorageFactory) {
        this.user = _user;
        this.keyManager = _keyManager;
        this.storage = createStorage<UserAppStorage>('tonomy.user.app.', storageFactory);
    }

    static async create(options: AppCreateOptions) {
        const username = new TonomyUsername(options.usernamePrefix, AccountType.APP, getSettings().accountSuffix);

        // TODO remove this
        const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');

        // TODO update storage with app in a pending state
        const res = await idContract.newapp(
            options.appName,
            options.description,
            username.usernameHash,
            options.logoUrl,
            options.origin,
            options.publicKey,
            createSigner(privateKey)
        );

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        // TODO update status of app to READY or something
        return {
            accountName: Name.from(newAccountAction.data.name),
            username: username,
            ...options,
        };
    }

    async loginWithApp(account: Name, key: PublicKey, password: string): Promise<void> {
        const myAccount = await this.user.storage.accountName;

        const appRecord: AppRecord = {
            account: account.toString(),
            added: new Date(),
            status: AppStatus.PENDING,
        };

        let apps = await this.storage.apps;
        if (!apps) {
            apps = [];
        }
        apps.push(appRecord);
        this.storage.apps = apps;
        await this.storage.apps;

        const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.PASSWORD, password);
        await idContract.loginwithapp(myAccount.toString(), account.toString(), key, signer);

        appRecord.status = AppStatus.READY;
        this.storage.apps = apps;
        await this.storage.apps;
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

export { App, JWTLoginPayload, AppStatus };
