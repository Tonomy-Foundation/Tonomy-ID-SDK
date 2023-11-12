import { Name, PrivateKey, API, Checksum256 } from '@wharfkit/antelope';
import { KeyManager, KeyManagerLevel } from '../storage/keymanager';
import { GetPersonResponse, IDContract } from '../services/blockchain/contracts/IDContract';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { getAccount, getChainInfo } from '../services/blockchain/eosio/eosio';
import { createStorage, PersistentStorageClean, StorageFactory, STORAGE_NAMESPACE } from '../storage/storage';
import { SdkErrors, throwError, SdkError } from '../util/errors';
import { AccountType, TonomyUsername } from '../util/username';
import { getSettings } from '../util/settings';
import { Communication } from '../services/communication/communication';
import { Issuer } from '@tonomy/did-jwt-vc';
import { createVCSigner, generateRandomKeyPair } from '../util/crypto';
import { Message, LinkAuthRequestMessage, LinkAuthRequestResponseMessage } from '../services/communication/message';
import { getAccountNameFromDid, parseDid } from '../util/ssi/did';
import { createAccount } from '../services/communication/accounts';
import { UserStatusEnum } from '../types/UserStatusEnum';
import {
    AbstractUserBase,
    ICheckedRequest,
    ICreateAccountOptions,
    ILoginOptions,
    IUserAppRecord,
    IUserAuthentication,
    IUserBase,
    IUserHCaptcha,
    IUserOnboarding,
    IUserRequestsManager,
    IUserStorage,
} from '../types/User';
import { PublicKey } from '@wharfkit/antelope';
import { LoginRequest } from '../util/request';
import { LoginRequestResponseMessage } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { objToBase64Url } from '../util/base64';
import { DID, URL as URLtype } from '../util/ssi/types';
import { RequestsManager } from '../helpers/requestsManager';
import { ResponsesManager } from '../helpers/responsesManager';
import { Mixin } from 'ts-mixer';
import { App } from './App';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { verifyKeyExistsForApp } from '../helpers/user';

const idContract = IDContract.Instance;

export class UserBase extends AbstractUserBase implements IUserBase {
    protected keyManager: KeyManager;
    protected storage: IUserStorage & PersistentStorageClean;
    communication: Communication;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        super();
        this.keyManager = _keyManager;
        this.storage = createStorage<IUserStorage>(STORAGE_NAMESPACE + 'user.', storageFactory);

        //TODO implement dependency inversion
        this.communication = new Communication(false);
    }

    async getStatus(): Promise<UserStatusEnum> {
        return await this.storage.status;
    }

    async getAccountName(): Promise<Name> {
        return await this.storage.accountName;
    }

    async getUsername(): Promise<TonomyUsername> {
        const storage = await this.storage.username;

        if (!storage) throwError('Username not set', SdkErrors.InvalidData);
        else if (storage instanceof TonomyUsername) {
            return storage;
        } else if (typeof storage === 'string') {
            return new TonomyUsername(storage);
        } else {
            throwError('Username not in expected format', SdkErrors.InvalidData);
        }
    }

    async getDid(): Promise<string> {
        return await this.storage.did;
    }

    async getIssuer(): Promise<Issuer> {
        const did = await this.getDid();
        const signer = createVCSigner(this.keyManager, KeyManagerLevel.LOCAL);

        return {
            did: did + '#local',
            signer: signer.sign as any,
            alg: 'ES256K-R',
        };
    }
}

export abstract class AbstractUserAuthorization extends AbstractUserBase implements IUserAuthentication {
    async savePassword(masterPassword: string, options: ICreateAccountOptions): Promise<void> {
        let privateKey: PrivateKey;
        let salt: Checksum256;

        if (options.salt) {
            salt = options.salt;
            const res = await options.keyFromPasswordFn(masterPassword, salt);

            privateKey = res.privateKey;
        } else {
            const res = await options.keyFromPasswordFn(masterPassword);

            privateKey = res.privateKey;
            salt = res.salt;
        }

        this.storage.salt = salt;
        await this.storage.salt; // wait for magic setter on storage

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PASSWORD,
            privateKey,
            challenge: masterPassword,
        });

        await this.keyManager.storeKey({
            level: KeyManagerLevel.ACTIVE,
            privateKey,
            // eventually this should be different than the password key, but for now Antelope protocol doesn't support it
            // ideally we would have a different structure, and active key will be linked to local key
        });
    }

    async checkPassword(password: string, options: ILoginOptions): Promise<boolean> {
        const username = await this.getAccountName();

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await this.keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        return true;
    }

    async savePIN(pin: string): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PIN,
            privateKey,
            challenge: pin,
        });
    }

    async checkPin(pin: string): Promise<boolean> {
        const pinKey = await this.keyManager.checkKey({
            level: KeyManagerLevel.PIN,
            challenge: pin,
        });

        if (!pinKey) throwError('Pin is incorrect', SdkErrors.PinInvalid);
        return true;
    }

    async saveFingerprint(): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.BIOMETRIC,
            privateKey,
        });
    }

    async saveLocal(): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.LOCAL,
            privateKey,
        });
    }
}

export abstract class AbstractUserHCaptcha extends AbstractUserBase implements IUserHCaptcha {
    async getCaptchaToken(): Promise<string> {
        return await this.storage.captchaToken;
    }

    async saveCaptchaToken(captchaToken: string) {
        this.storage.captchaToken = captchaToken;
        await this.storage.captchaToken;
    }
}

export abstract class AbstractUserOnboarding extends AbstractUserAuthorization implements IUserOnboarding {
    private chainID!: Checksum256;

    private validateUsername(username: string): void {
        if (typeof username !== 'string' || username.length === 0)
            throwError('Username must be a string', SdkErrors.InvalidData);

        // Allow only letters, numbers, underscore and dash (1 to 50 characters)
        if (!/^[A-Za-z0-9_-]{1,100}$/g.test(username))
            throwError('Username contains invalid characters', SdkErrors.InvalidUsername);
    }

    private async createDid(): Promise<string> {
        if (!this.chainID) {
            this.chainID = (await getChainInfo()).chain_id as unknown as Checksum256;
        }

        const accountName = await this.storage.accountName;

        this.storage.did = `did:antelope:${this.chainID}:${accountName.toString()}`;
        await this.storage.did;
        return this.storage.did;
    }

    async login(username: TonomyUsername, password: string, options: ILoginOptions): Promise<GetPersonResponse> {
        this.validateUsername(username.getBaseUsername());
        const { keyManager } = this;

        const idData = await idContract.getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        this.storage.accountName = Name.from(idData.account_name);
        this.storage.username = username;
        this.storage.status = UserStatusEnum.LOGGING_IN;

        await this.storage.accountName;
        await this.storage.username;
        await this.storage.status;
        await this.createDid();

        return idData;
    }

    async isLoggedIn(): Promise<boolean> {
        return (await this.getStatus()) === UserStatusEnum.READY;
    }

    async createPerson(): Promise<void> {
        const { keyManager } = this;
        const username = await this.getUsername();

        const usernameHash = username.usernameHash;

        const publicKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });
        const salt = await this.storage.salt;
        const captchaToken = await this.storage.captchaToken;

        try {
            const res = await createAccount({
                usernameHash: usernameHash,
                publicKey,
                salt,
                captchaToken,
            });

            this.storage.accountName = res.accountName;
        } catch (e) {
            if (e.status === 400 && e.message === 'Username is taken') {
                throwError('Username is taken', SdkErrors.UsernameTaken);
            }

            throw e;
        }

        await this.storage.accountName;

        this.storage.status = UserStatusEnum.CREATING_ACCOUNT;
        await this.storage.status;
        await this.createDid();

        if (getSettings().loggerLevel === 'debug') {
            console.log('Created account', {
                accountName: (await this.storage.accountName).toString(),
                username: (await this.getUsername()).getBaseUsername(),
                did: await this.getDid(),
            });
        }
    }

    async saveUsername(username: string): Promise<void> {
        this.validateUsername(username);
        const normalizedUsername = username.normalize('NFKC');

        let user: API.v1.AccountObject;
        const fullUsername = TonomyUsername.fromUsername(
            normalizedUsername,
            AccountType.PERSON,
            getSettings().accountSuffix
        );

        try {
            user = await getAccountInfo(fullUsername);
            if (user) throwError('Username is taken', SdkErrors.UsernameTaken);
        } catch (e) {
            if (!(e instanceof SdkError && e.code === SdkErrors.UsernameNotFound)) {
                throw e;
            }
        }

        this.storage.username = fullUsername;
        await this.storage.username;
    }

    async usernameExists(username: string): Promise<boolean> {
        const normalizedUsername = username.normalize('NFKC');

        const fullUsername = TonomyUsername.fromUsername(
            normalizedUsername,
            AccountType.PERSON,
            getSettings().accountSuffix
        );

        try {
            await getAccountInfo(fullUsername);
            return true;
        } catch (e) {
            if (e instanceof SdkError && e.code === SdkErrors.UsernameNotFound) {
                return false;
            }

            throw e;
        }
    }

    async updateKeys(password: string): Promise<void> {
        const status = await this.getStatus();

        if (status === UserStatusEnum.DEACTIVATED) {
            throwError("Can't update keys for deactivated user", SdkErrors.UserDeactivated);
        }

        const { keyManager } = this;

        // TODO:
        // use status in smart contract to lock the account till finished creating
        const keys = {} as {
            PIN: string;
            BIOMETRIC: string;
            LOCAL: string;
        };

        try {
            const pinKey = await keyManager.getKey({ level: KeyManagerLevel.PIN });

            keys.PIN = pinKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        try {
            const biometricKey = await keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC });

            keys.BIOMETRIC = biometricKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        try {
            const localKey = await keyManager.getKey({ level: KeyManagerLevel.LOCAL });

            keys.LOCAL = localKey.toString();
        } catch (e) {
            if (!(e instanceof SdkError) || e.code !== SdkErrors.KeyNotFound) throw e;
        }

        const signer = createKeyManagerSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        const accountName = await this.storage.accountName;

        await idContract.updatekeysper(accountName.toString(), keys, signer);
        this.storage.status = UserStatusEnum.READY;
        await this.storage.status;
    }

    async checkKeysStillValid(): Promise<boolean> {
        // Account been created, or has not finished being created yet
        if ((await this.getStatus()) !== UserStatusEnum.READY)
            throwError('User is not ready', SdkErrors.AccountDoesntExist);

        const accountInfo = await getAccountInfo(await this.storage.accountName);

        const checkPairs = [
            {
                level: KeyManagerLevel.PIN,
                permission: 'pin',
            },
            {
                level: KeyManagerLevel.BIOMETRIC,
                permission: 'biometric',
            },
            {
                level: KeyManagerLevel.LOCAL,
                permission: 'local',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'active',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'owner',
            },
        ];

        for (const pair of checkPairs) {
            let localKey;

            try {
                localKey = await this.keyManager.getKey({ level: pair.level });
            } catch (e) {
                localKey = null;
            }

            let blockchainPermission;

            try {
                blockchainPermission = accountInfo.getPermission(pair.permission);
            } catch (e) {
                blockchainPermission = null;
            }

            if (!localKey && blockchainPermission) {
                // User probably logged into another device and finished create account flow there
                throwError(
                    `${pair.level} key was not found in the keyManager, but was found on the blockchain`,
                    SdkErrors.KeyNotFound
                );
            }

            if (localKey && !blockchainPermission) {
                // User probably hasn't finished create account flow yet
                throwError(
                    `${pair.level} keys was not found on the blockchain, but was found in the keyManager`,
                    SdkErrors.KeyNotFound
                );
            }

            if (
                localKey &&
                blockchainPermission &&
                localKey.toString() !== blockchainPermission.required_auth.keys[0].key.toString()
            ) {
                // User has logged in on another device
                throwError(`${pair.level} keys do not match`, SdkErrors.KeyNotFound);
            }
        }

        return true;
    }

    async logout(): Promise<void> {
        // remove all keys
        for (const level of Object.keys(KeyManagerLevel)) {
            try {
                await this.keyManager.getKey({ level: KeyManagerLevel.from(level) });
                this.keyManager.removeKey({ level: KeyManagerLevel.from(level) });
            } catch (e) {
                if (
                    !(e instanceof SdkError) ||
                    (e.code !== SdkErrors.KeyNotFound && e.code !== SdkErrors.InvalidKeyLevel)
                )
                    throw e;
            }
        }

        // clear storage data
        this.storage.clear();

        this.communication.disconnect();
    }

    async initializeFromStorage(): Promise<boolean> {
        const accountName = await this.getAccountName();

        if (accountName) {
            return await this.checkKeysStillValid();
        } else {
            throwError('Account "' + accountName + '" not found', SdkErrors.AccountDoesntExist);
        }
    }
}

export abstract class AbstractUserRequestsManager extends AbstractUserBase implements IUserRequestsManager {
    async handleLinkAuthRequestMessage(message: Message): Promise<void> {
        const linkAuthRequestMessage = new LinkAuthRequestMessage(message);

        try {
            if (!getAccountNameFromDid(message.getSender()).equals(await this.getAccountName()))
                throwError('Message not sent from authorized account', SdkErrors.SenderNotAuthorized);

            const payload = linkAuthRequestMessage.getPayload();

            const contract = payload.contract;
            const action = payload.action;

            const permission = parseDid(message.getSender()).fragment;

            if (!permission) throwError('DID does not contain fragment', SdkErrors.MissingParams);

            await idContract.getApp(Name.from(permission));
            // Throws SdkErrors.DataQueryNoRowDataFound error if app does not exist
            // which cannot happen in theory, as the user is already logged in

            const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.ACTIVE);

            await idContract.linkAuth(
                (await this.getAccountName()).toString(),
                contract.toString(),
                action.toString(),
                permission,
                signer
            );

            const linkAuthRequestResponseMessage = await LinkAuthRequestResponseMessage.signMessage(
                {
                    requestId: linkAuthRequestMessage.getVc().getId() as string,
                    success: true,
                },
                await this.getIssuer(),
                linkAuthRequestMessage.getSender()
            );

            await this.communication.sendMessage(linkAuthRequestResponseMessage);
        } catch (e) {
            if (e instanceof SdkError && e.code === SdkErrors.SenderNotAuthorized) {
                // somebody may be trying to DoS the user, drop
                return;
            } else {
                // all other errors are Tonomy software errors, so throw to bubble up
                throw e;
            }
        }
    }

    async loginWithApp(app: App, key: PublicKey): Promise<void> {
        const myAccount = await this.storage.accountName;

        const appRecord: IUserAppRecord = {
            app,
            added: new Date(),
            status: AppStatusEnum.PENDING,
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

        appRecord.status = AppStatusEnum.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    /** Accepts a login request by authorizing keys on the blockchain (if the are not already authorized)
     * And sends a response to the requesting app
     *
     * @param {{request: WalletRequest, app?: App, requiresLogin?: boolean}[]} requestsWithMetadata - Array of requests to fulfill (login or data sharing requests)
     * @param {'mobile' | 'browser'} platform - Platform of the request, either 'mobile' or 'browser'
     * @param {{callbackPath?: URLtype, messageRecipient?: DID}} options - Options for the response
     * @returns {Promise<void | URLtype>} the callback url if the platform is mobile, or undefined if it is browser (a message is sent to the user)
     */
    async acceptLoginRequest(
        responsesManager: ResponsesManager,
        platform: 'mobile' | 'browser',
        options: {
            callbackOrigin?: URLtype;
            callbackPath?: URLtype;
            messageRecipient?: DID;
        }
    ): Promise<void | URLtype> {
        const finalResponses = await responsesManager.createResponses(this);

        const responsePayload: LoginRequestResponseMessagePayload = {
            success: true,
            response: finalResponses,
        };

        if (platform === 'mobile') {
            if (!options.callbackPath || !options.callbackOrigin)
                throwError('Missing callback origin or path', SdkErrors.MissingParams);
            let callbackUrl = options.callbackOrigin + options.callbackPath + '?';

            callbackUrl += 'payload=' + objToBase64Url(responsePayload);

            return callbackUrl;
        } else {
            if (!options.messageRecipient) throwError('Missing message recipient', SdkErrors.MissingParams);
            const issuer = await this.getIssuer();
            const message = await LoginRequestResponseMessage.signMessage(
                responsePayload,
                issuer,
                options.messageRecipient
            );

            await this.communication.sendMessage(message);
        }
    }

    /** Verifies the login requests, and checks if the apps have already been authorized with those keys
     * This function is currently only used in the unfinished feature https://github.com/Tonomy-Foundation/Tonomy-ID/issues/705
     * See unmerged PR https://github.com/Tonomy-Foundation/Tonomy-ID/pull/744
     * @depreciated This function is now incorporated in ResponsesManager.fetchMeta()
     *
     * @param {LoginRequest[]} requests - Array of LoginRequest to check
     * @returns {Promise<CheckedRequest[]>} - Array of requests that have been verified and had authorization checked
     */
    async checkLoginRequests(requests: LoginRequest[]): Promise<ICheckedRequest[]> {
        const managedRequests = new RequestsManager(requests);

        await managedRequests.verify();

        const response: ICheckedRequest[] = [];

        for (const request of managedRequests.getLoginRequestsOrThrow()) {
            const payload = request.getPayload();

            const app = await App.getApp(payload.origin);

            let requiresLogin = true;

            try {
                await verifyKeyExistsForApp(await this.getAccountName(), {
                    publicKey: payload.publicKey,
                });
                requiresLogin = false;
            } catch (e) {
                if (e instanceof SdkError && e.code === SdkErrors.UserNotLoggedInWithThisApp) {
                    // Never consented
                    requiresLogin = true;
                } else {
                    throw e;
                }
            }

            response.push({
                request,
                app,
                requiresLogin,
                ssoApp: payload.origin === getSettings().ssoWebsiteOrigin,
                requestDid: request.getIssuer(),
            });
        }

        return response;
    }
}

export class User
    extends Mixin(
        UserBase,
        AbstractUserAuthorization,
        AbstractUserHCaptcha,
        AbstractUserOnboarding,
        AbstractUserRequestsManager
    )
    implements IUserBase, IUserAuthentication, IUserHCaptcha, IUserOnboarding, IUserRequestsManager { }

export async function getAccountInfo(account: TonomyUsername | Name): Promise<API.v1.AccountObject> {
    let accountName: Name;

    if (account instanceof TonomyUsername) {
        const idData = await idContract.getPerson(account);

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
export function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): User {
    return new User(keyManager, storageFactory);
}
