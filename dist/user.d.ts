import { Name, API, Checksum256 } from '@greymass/eosio';
import { PushTransactionResponse } from '@greymass/eosio/src/api/v1/types';
import { KeyManager } from './services/keymanager';
import { GetPersonResponse } from './services/contracts/IDContract';
import { PersistentStorageClean, StorageFactory } from './services/storage';
import { TonomyUsername } from './services/username';
import { UserApps } from './userApps';
import { Communication } from './communication';
import { Message } from './util/message';
declare enum UserStatus {
    CREATING_ACCOUNT = "CREATING_ACCOUNT",
    LOGGING_IN = "LOGGING_IN",
    READY = "READY",
    DEACTIVATED = "DEACTIVATED"
}
declare namespace UserStatus {
    function indexFor(value: UserStatus): number;
    function from(value: number | string): UserStatus;
}
export { UserStatus };
export declare type UserStorage = {
    status: UserStatus;
    accountName: Name;
    username: TonomyUsername;
    salt: Checksum256;
    did: string;
};
export declare class User {
    private chainID;
    keyManager: KeyManager;
    storage: UserStorage & PersistentStorageClean;
    apps: UserApps;
    communication: Communication;
    constructor(_keyManager: KeyManager, storageFactory: StorageFactory);
    getStatus(): Promise<UserStatus>;
    getAccountName(): Promise<Name>;
    getUsername(): Promise<TonomyUsername>;
    getDid(): Promise<string>;
    saveUsername(username: string): Promise<void>;
    savePassword(masterPassword: string, options?: {
        salt?: Checksum256;
    }): Promise<void>;
    savePIN(pin: string): Promise<void>;
    checkPin(pin: string): Promise<boolean>;
    saveFingerprint(): Promise<void>;
    saveLocal(): Promise<void>;
    createPerson(): Promise<PushTransactionResponse>;
    updateKeys(password: string): Promise<void>;
    checkPassword(password: string): Promise<boolean>;
    login(username: TonomyUsername, password: string): Promise<GetPersonResponse>;
    checkKeysStillValid(): Promise<boolean>;
    logout(): Promise<void>;
    isLoggedIn(): Promise<boolean>;
    static getAccountInfo(account: TonomyUsername | Name): Promise<API.v1.AccountObject>;
    signMessage(payload: any, recipient?: string): Promise<Message>;
    /**
     * Generate did in storage
     * @return {string} did string
     */
    createDid(): Promise<string>;
    intializeFromStorage(): Promise<boolean>;
}
/**
 * Initialize and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
export declare function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): User;
