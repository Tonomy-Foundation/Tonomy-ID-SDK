import { Name, API, PublicKey } from '@wharfkit/antelope';
import { LoginRequestResponseMessage } from '../services/communication/message';
import { IUser } from '../types/User';
import { SdkErrors, throwError, URL as URLtype, DualWalletRequests, WalletResponseError } from '../util';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { App } from '../controllers/App';
import { getAccount } from '../services/blockchain/eosio/eosio';
import { StorageFactory } from '../storage/storage';
import { TonomyUsername } from '../util/username';
import { getTonomyContract } from '../services/blockchain';
import { User } from '../controllers/User';
import { setupDatabase } from '../../setup';

export async function getAccountInfo(account: TonomyUsername | Name): Promise<API.v1.AccountObject> {
    let accountName: Name;

    if (account instanceof TonomyUsername) {
        const idData = await getTonomyContract().getPerson(account);

        accountName = idData.account_name;
    } else {
        accountName = account;
    }

    return await getAccount(accountName);
}

/**
 * Initialize and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
export async function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): Promise<IUser> {
    const dataSource = await setupDatabase();

    return new User(keyManager, storageFactory, dataSource);
}

/**
 * Rejects a login request by sending a response to the requesting app
 *
 * @static function so that it can be used to cancel requests in flows where users are not logged in
 *
 * @param {DualWalletRequests} requests - Array of requests to reject
 * @param {'redirect' | 'message'} respondWith - How to respond to the request
 * @param {WalletResponseError} error - Error to send back to the requesting app
 * @returns {Promise<void | URLtype>} - If respondWith is 'redirect', returns a URL to redirect to; if 'message', sends a message to the requesting app
 */
export async function rejectLoginRequest(
    requests: DualWalletRequests,
    respondWith: 'redirect' | 'message',
    error: WalletResponseError,
    options: {
        user?: IUser;
    }
): Promise<void | URLtype> {
    const responsePayload = await requests.reject(error);

    if (respondWith === 'redirect') {
        // on mobile, we should be redirecting directly back to the external app
        return responsePayload.getRedirectUrl();
    } else {
        if (!options.user) throwError('Missing user', SdkErrors.MissingParams);
        if (!requests.sso) throwError('SSO request not found', SdkErrors.MissingParams);
        const issuer = await options.user.getIssuer();
        const messageRecipient = requests.sso?.getDid();
        const message = await LoginRequestResponseMessage.signMessage(responsePayload, issuer, messageRecipient);

        await options.user.sendMessage(message);
    }
}

/**
 * Checks that a key exists in the key manager that has been authorized on the DID
 *
 * @description This is called on the callback page to verify that the user has logged in correctly
 *
 * @param {string} [accountName] - the account name to check the key on
 * @param {PublicKey} [publicKey] - the public key to check. if not supplied it will try lookup the app from window.location.origin
 * @param {KeyManager} [keyManager] - the key manager to check the key in
 * @param {KeyManagerLevel} [keyManagerLevel=BROWSER_LOCAL_STORAGE] - the level to check the key in
 * @returns {Promise<Name>} - the name of the permission that the key is authorized on
 *
 * @throws {SdkError} - if the key doesn't exist or isn't authorized
 */
export async function verifyKeyExistsForApp(
    accountName: Name,
    options: {
        publicKey?: PublicKey;
        keyManager?: KeyManager;
    }
): Promise<Name> {
    const account = await getAccountInfo(accountName);

    if (!account) throwError("couldn't fetch account", SdkErrors.AccountNotFound);

    if (options.publicKey) {
        const pubKey = options.publicKey;

        const permissionWithKey = account.permissions.find(
            (p) => p.required_auth.keys[0].key.toString() === pubKey.toString()
        );

        if (!permissionWithKey)
            throwError(`No permission found with key ${pubKey}`, SdkErrors.UserNotLoggedInWithThisApp);

        return permissionWithKey.perm_name;
    } else {
        if (!options.keyManager) throwError('keyManager missing', SdkErrors.MissingParams);
        const pubKey = await options.keyManager.getKey({ level: KeyManagerLevel.BROWSER_LOCAL_STORAGE });

        const app = await App.getApp(window.location.origin);

        try {
            const permission = account.getPermission(app.accountName);
            const publicKey = permission.required_auth.keys[0].key;

            if (pubKey.toString() !== publicKey.toString()) throwError('key not authorized', SdkErrors.KeyNotFound);
        } catch (e) {
            if (e.message.startsWith('Unknown permission '))
                throwError(`No permission found for app ${app.accountName}`, SdkErrors.UserNotLoggedInWithThisApp);
            else throw e;
        }

        return app.accountName;
    }
}
