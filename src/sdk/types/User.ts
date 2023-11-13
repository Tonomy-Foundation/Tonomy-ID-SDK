import { Name, PrivateKey, Checksum256 } from '@wharfkit/antelope';
import { GetPersonResponse } from '../services/blockchain/contracts/IDContract';
import { TonomyUsername } from '../util/username';
import { Issuer } from '@tonomy/did-jwt-vc';
import { Message } from '../services/communication/message';
import { UserStatusEnum } from './UserStatusEnum';
import { KeyManager } from '../storage/keymanager';
import { PersistentStorageClean } from '../storage/storage';
import { Communication } from '../services/communication/communication';
import { App } from '../controllers/App';
import { DID, LoginRequest, WalletRequest, URL as URLtype } from '../util';
import { PublicKey } from '@wharfkit/antelope';
import { ResponsesManager } from '../helpers/responsesManager';
import { AppStatusEnum } from './AppStatusEnum';

type KeyFromPasswordFn = (
    password: string,
    salt?: Checksum256
) => Promise<{ privateKey: PrivateKey; salt: Checksum256 }>;

export interface IUserStorage {
    status: UserStatusEnum;
    accountName: Name;
    username: TonomyUsername;
    salt: Checksum256;
    did: string;
    // TODO update to have all data from blockchain

    captchaToken: string;

    appRecords: IUserAppRecord[];
}

export interface ILoginOptions {
    keyFromPasswordFn: KeyFromPasswordFn;
}

export interface ICreateAccountOptions extends ILoginOptions {
    salt?: Checksum256;
}

export interface IUserAppRecord {
    app: App;
    added: Date;
    status: AppStatusEnum;
}

export type IOnPressLoginOptions = {
    callbackPath: string;
    redirect?: boolean;
    dataRequest?: {
        username?: boolean;
    };
};

export interface ICheckedRequest {
    request: WalletRequest;
    app: App;
    requiresLogin: boolean;
    ssoApp: boolean;
    requestDid?: string;
}

export interface IUserBase {
    getStatus(): Promise<UserStatusEnum>;
    getAccountName(): Promise<Name>;
    getUsername(): Promise<TonomyUsername>;
    getDid(): Promise<string>;
    getIssuer(): Promise<Issuer>;
}

export abstract class AbstractUserBase implements IUserBase {
    protected abstract keyManager: KeyManager;
    protected abstract storage: IUserStorage & PersistentStorageClean;
    // TODO make `communication` protected
    abstract communication: Communication;

    abstract getStatus(): Promise<UserStatusEnum>;
    abstract getAccountName(): Promise<Name>;
    abstract getUsername(): Promise<TonomyUsername>;
    abstract getDid(): Promise<string>;
    abstract getIssuer(): Promise<Issuer>;
}

export interface IUserAuthentication extends IUserBase {
    savePassword(masterPassword: string, options: ICreateAccountOptions): Promise<void>;
    checkPassword(password: string, options: ILoginOptions): Promise<boolean>;
    savePIN(pin: string): Promise<void>;
    checkPin(pin: string): Promise<boolean>;
    saveFingerprint(): Promise<void>;
    saveLocal(): Promise<void>;
}

export interface IUserHCaptcha extends IUserBase {
    getCaptchaToken(): Promise<string>;
    saveCaptchaToken(captchaToken: string): Promise<void>;
}

export interface IUserOnboarding extends IUserAuthentication {
    login(username: TonomyUsername, password: string, options: ILoginOptions): Promise<GetPersonResponse>;
    isLoggedIn(): Promise<boolean>;
    createPerson(): Promise<void>;
    saveUsername(username: string): Promise<void>;

    /**
     * Check if a username already exists
     * @param {string} username - a string param that represents the username
     * @returns {boolean} true if username already exists and false if doesn't exists
     */
    usernameExists(username: string): Promise<boolean>;
    updateKeys(password: string): Promise<void>;
    checkKeysStillValid(): Promise<boolean>;
    logout(): Promise<void>;
    initializeFromStorage(): Promise<boolean>;
}

export interface IUserRequestsManager extends IUserBase {
    handleLinkAuthRequestMessage(message: Message): Promise<void>;
    loginWithApp(app: App, key: PublicKey): Promise<void>;

    /** Accepts a login request by authorizing keys on the blockchain (if the are not already authorized)
     * And sends a response to the requesting app
     *
     * @param {{request: WalletRequest, app?: App, requiresLogin?: boolean}[]} requestsWithMetadata - Array of requests to fulfill (login or data sharing requests)
     * @param {'mobile' | 'browser'} platform - Platform of the request, either 'mobile' or 'browser'
     * @param {{callbackPath?: URLtype, messageRecipient?: DID}} options - Options for the response
     * @returns {Promise<void | URLtype>} the callback url if the platform is mobile, or undefined if it is browser (a message is sent to the user)
     */
    acceptLoginRequest(
        responsesManager: ResponsesManager,
        platform: 'mobile' | 'browser',
        options: {
            callbackOrigin?: URLtype;
            callbackPath?: URLtype;
            messageRecipient?: DID;
        }
    ): Promise<void | URLtype>;

    /** Verifies the login requests, and checks if the apps have already been authorized with those keys
     * This function is currently only used in the unfinished feature https://github.com/Tonomy-Foundation/Tonomy-ID/issues/705
     * See unmerged PR https://github.com/Tonomy-Foundation/Tonomy-ID/pull/744
     * @depreciated This function is now incorporated in ResponsesManager.fetchMeta()
     *
     * @param {LoginRequest[]} requests - Array of LoginRequest to check
     * @returns {Promise<CheckedRequest[]>} - Array of requests that have been verified and had authorization checked
     */
    checkLoginRequests(requests: LoginRequest[]): Promise<ICheckedRequest[]>;
}
