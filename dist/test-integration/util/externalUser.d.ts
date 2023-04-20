import { Name } from '@greymass/eosio';
import { Communication, KeyManager, Message, StorageFactory, Subscriber, User } from '../../src';
export declare function externalWebsiteUserPressLoginToTonomyButton(keyManager: KeyManager, loginAppOrigin: string, log?: boolean): Promise<{
    did: string;
    redirectUrl: string;
}>;
export declare function loginWebsiteOnRedirect(externalWebsiteDid: string, keyManager: KeyManager, log?: boolean): Promise<{
    did: string;
    jwtRequests: string[];
    communication: Communication;
}>;
export declare function setupTonomyIdAckSubscriber(did: string, log?: boolean): Promise<{
    subscriber: Subscriber;
    promise: Promise<{
        type: string;
        message: Message;
    }>;
}>;
export declare function setupTonomyIdRequestConfirmSubscriber(did: string, log?: boolean): Promise<{
    subscriber: Subscriber;
    promise: Promise<{
        type: string;
        message: Message;
    }>;
}>;
export declare function sendLoginRequestsMessage(requests: string[], keyManager: KeyManager, communication: Communication, recipientDid: string, log?: boolean): Promise<void>;
export declare function loginWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory, log?: boolean): Promise<{
    redirectJwt: Message | undefined;
    username: string | undefined;
    accountName: Name;
}>;
export declare function externalWebsiteOnCallback(keyManager: KeyManager, storageFactory: StorageFactory, accountName: Name, log?: boolean): Promise<void>;
export declare function externalWebsiteOnReload(keyManager: KeyManager, storageFactory: StorageFactory, tonomyUser: User, log?: boolean): Promise<void>;
