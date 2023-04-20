import { PublicKey } from '@greymass/eosio';
import { KeyManager, KeyManagerLevel } from './services/keymanager';
import { PersistentStorageClean, StorageFactory } from './services/storage';
import { User } from './user';
import { App, AppStatus } from './app';
import { Message } from './util/message';
export declare type UserAppRecord = {
    app: App;
    added: Date;
    status: AppStatus;
};
export declare type UserAppStorage = {
    appRecords: UserAppRecord[];
};
export declare type JWTLoginPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};
export declare type OnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
};
export declare class UserApps {
    user: User;
    keyManager: KeyManager;
    storage: UserAppStorage & PersistentStorageClean;
    constructor(_user: User, _keyManager: KeyManager, storageFactory: StorageFactory);
    loginWithApp(app: App, key: PublicKey): Promise<void>;
    /**
     * Verifies the login request are valid requests signed by valid DIDs
     *
     * @param requests {string | null} - a stringified array of JWTs
     * @returns {Promise<Message[]>} - an array of verified messages containing the login requests
     */
    static verifyRequests(requests: string | null): Promise<Message[]>;
    /**
     * Extracts the login requests, username and accountName from the URL
     *
     * @returns the requests (JWTs), username and accountName
     */
    static getLoginRequestParams(): {
        requests: string;
        username: string;
        accountName: string;
    };
    /**
     * Verifies the login request received in the URL were successfully authorized by Tonomy ID
     *
     * @description should be called in the callback page of the SSO Login website
     *
     * @returns {Promise<Message>} - the verified login request
     */
    static onRedirectLogin(): Promise<Message>;
    /**
     * Checks that a key exists in the key manager that has been authorized on the DID
     *
     * @description This is called on the callback page to verify that the user has logged in correctly
     *
     * @param accountName {string} - the account name to check the key on
     * @param keyManager {KeyManager} - the key manager to check the key in
     * @param keyManagerLevel {KeyManagerLevel=BROWSER_LOCAL_STORAGE} - the level to check the key in
     * @returns {Promise<boolean>} - true if the key exists and is authorized, false otherwise
     */
    static verifyKeyExistsForApp(accountName: string, keyManager: KeyManager, keyManagerLevel?: KeyManagerLevel): Promise<boolean>;
    /**
     * Verifies a jwt string is a valid message with signature from a DID
     * @param jwt {string} - the jwt string to verify
     * @returns {Promise<Message>} - the verified message
     */
    static verifyLoginJWT(jwt: string): Promise<Message>;
}
