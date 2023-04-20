import { KeyManager, App, User } from '../../src/index';
export declare function createUser(username: string, password: string): Promise<{
    user: User;
    password: string;
    auth: KeyManager;
}>;
export declare function createRandomID(): Promise<{
    user: User;
    password: string;
    pin: string;
    auth: KeyManager;
}>;
export declare function createRandomApp(logoUrl?: string, origin?: string): Promise<App>;
export declare function loginToTonomyCommunication(user: User, log?: boolean): Promise<void>;
export declare function scanQrAndAck(user: User, qrCodeData: string, log?: boolean): Promise<void>;
export declare function setupLoginRequestSubscriber(user: User, externalOrigin: string, externalDid: string, ssoOrigin: string, ssoDid: string, appsFound: boolean[], log?: boolean): Promise<unknown>;
