import { KeyManager } from './services/keymanager';
import { JWTLoginPayload, OnPressLoginOptions } from './userApps';
import { Message } from './util/message';
import { PersistentStorageClean, StorageFactory } from './services/storage';
import { Name } from '@greymass/eosio';
import { TonomyUsername } from './services/username';
export declare type ExternalUserStorage = {
    accountName: Name;
    username: TonomyUsername;
    loginRequest: JWTLoginPayload;
};
export declare type VerifyLoginOptions = {
    checkKeys?: boolean;
    keyManager: KeyManager;
    storageFactory?: StorageFactory;
};
export declare class ExternalUser {
    keyManager: KeyManager;
    storage: ExternalUserStorage & PersistentStorageClean;
    did_: string;
    /**
     * Creates a new external user
     *
     * @param _keyManager {KeyManager} - the key manager to use for signing
     */
    constructor(_keyManager: KeyManager, _storageFactory: StorageFactory);
    static getUser(keyManager: KeyManager, storageFactory?: StorageFactory): Promise<ExternalUser>;
    getDid(): Promise<string>;
    /**
     * Sets the account name of the user
     *
     * @param accountName {Name} - the account name of the user
     */
    setAccountName(accountName: Name): Promise<void>;
    /**
     * Sets the username of the user
     *
     * @param username {string} - the username of the user
     */
    setUsername(username: string): Promise<void>;
    /**
     * Gets the username of the user
     *
     * @returns {Promise<TonomyUsername>} - the username of the user
     */
    getUsername(): Promise<TonomyUsername>;
    /**
     * Sets the login request
     *
     * @param loginRequest {JWTLoginPayload} - the login request
     */
    setLoginRequest(loginRequest: JWTLoginPayload): Promise<void>;
    /**
     * Gets the login request
     *
     * @returns {Promise<JWTLoginPayload>} - the login request
     */
    getLoginRequest(): Promise<JWTLoginPayload>;
    /**
     * Gets the account name of the user
     *
     * @returns {Promise<Name>} - the account name of the user
     */
    getAccountName(): Promise<Name>;
    /**
     * Redirects the user to login to the app with their Tonomy ID account
     *
     * @description should be called when the user clicks on the login button
     *
     * @param onPressLoginOptions {OnPressLoginOptions} - options for the login
     * @property onPressLoginOptions.redirect {boolean} - if true, redirects the user to the login page, if false, returns the token
     * @property onPressLoginOptions.callbackPath {string} - the path to redirect the user to after login
     * @param keyManager {KeyManager} - the key manager to use to store the keys
     * @returns {Promise<string | void>} - if redirect is true, returns void, if redirect is false, returns the login request in the form of a JWT token
     */
    static loginWithTonomy({ redirect, callbackPath }: OnPressLoginOptions, keyManager: KeyManager): Promise<string | void>;
    /**
     *
     * @param [keymanager=JSKEymanager]
     * @throws if user doesn't exists, keys are missing or user not loggedIn
     * @returns the external user object
     */
    /**
     * Signs a message with the given key manager and the key level
     *
     * @param message {any} - an object to sign
     * @param keyManager {KeyManager} - the key manager to use to sign the message
     */
    static signMessage(message: any, keyManager: KeyManager, recipient?: string): Promise<Message>;
    /**
     * Receives the login request from Tonomy ID and verifies the login was successful
     *
     * @description should be called in the callback page
     *
     * @param {options} VerifyLoginOptions - options for the login
     * @property {options.checkKeys} boolean - if true, checks the keys in the keyManager against the blockchain
     * @property {options.keyManager} KeyManager - the key manager to use to storage and manage keys
     * @property {options.storageFactory} [StorageFactory] - the storage factory to use to store data
     *
     * @returns {Promise<ExternalUser>} an external user object ready to use
     */
    static verifyLoginRequest(options: VerifyLoginOptions): Promise<ExternalUser>;
}
