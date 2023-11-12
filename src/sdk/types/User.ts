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
    // TODO make `communication` this protected!
    abstract communication: Communication;

    abstract getStatus(): Promise<UserStatusEnum>;
    abstract getAccountName(): Promise<Name>;
    abstract getUsername(): Promise<TonomyUsername>;
    abstract getDid(): Promise<string>;
    abstract getIssuer(): Promise<Issuer>;
}

export interface IUserAuthentication {
    savePassword(masterPassword: string, options: ICreateAccountOptions): Promise<void>;
    checkPassword(password: string, options: ILoginOptions): Promise<boolean>;
    savePIN(pin: string): Promise<void>;
    checkPin(pin: string): Promise<boolean>;
    saveFingerprint(): Promise<void>;
    saveLocal(): Promise<void>;
}

export interface IUserHCaptcha {
    getCaptchaToken(): Promise<string>;
    saveCaptchaToken(captchaToken: string): Promise<void>;
}

export interface IUserOnboarding {
    login(username: TonomyUsername, password: string, options: ILoginOptions): Promise<GetPersonResponse>;
    isLoggedIn(): Promise<boolean>;
    createPerson(): Promise<void>;
    saveUsername(username: string): Promise<void>;
    usernameExists(username: string): Promise<boolean>;
    updateKeys(password: string): Promise<void>;
    checkKeysStillValid(): Promise<boolean>;
    logout(): Promise<void>;
    initializeFromStorage(): Promise<boolean>;
}

import { PublicKey } from '@wharfkit/antelope';
import { ResponsesManager } from '../helpers/responsesManager';
import { AppStatusEnum } from './AppStatusEnum';

export interface IUserRequestsManager {
    handleLinkAuthRequestMessage(message: Message): Promise<void>;
    loginWithApp(app: App, key: PublicKey): Promise<void>;
    acceptLoginRequest(
        responsesManager: ResponsesManager,
        platform: 'mobile' | 'browser',
        options: {
            callbackOrigin?: URLtype;
            callbackPath?: URLtype;
            messageRecipient?: DID;
        }
    ): Promise<void | URLtype>;
    checkLoginRequests(requests: LoginRequest[]): Promise<ICheckedRequest[]>;
}
