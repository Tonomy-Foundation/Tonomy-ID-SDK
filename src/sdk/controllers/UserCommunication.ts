import { Communication, Subscriber, VeriffSubscriber } from '../services/communication/communication';
import { AuthenticationMessage, Message, SwapTokenMessage } from '../services/communication/message';
import { KeyManager } from '../storage/keymanager';
import { StorageFactory } from '../storage/storage';
import { IUserCommunication } from '../types/User';
import { UserAuthorization } from './UserAuthorization';

export abstract class UserCommunication extends UserAuthorization implements IUserCommunication {
    protected communication: Communication;

    constructor(_keyManager: KeyManager, storageFactory: StorageFactory) {
        super(_keyManager, storageFactory);
        this.communication = new Communication(false);
    }

    async loginCommunication(authorization: AuthenticationMessage): Promise<boolean> {
        return await this.communication.login(authorization);
    }

    unsubscribeMessage(id: number): void {
        this.communication.unsubscribeMessage(id);
    }

    subscribeMessage(subscriber: Subscriber, type: string): number {
        return this.communication.subscribeMessage(subscriber, type);
    }

    subscribeVeriffVerification(subscriber: VeriffSubscriber): number {
        return this.communication.subscribeVeriffVerification(subscriber);
    }

    unsubscribeVeriffVerification(id: number): void {
        this.communication.unsubscribeVeriffVerification(id);
    }

    async sendMessage(message: Message): Promise<boolean> {
        return await this.communication.sendMessage(message);
    }

    async sendSwapMessage(message: SwapTokenMessage): Promise<boolean> {
        return await this.communication.sendSwapMessage(message);
    }

    disconnectCommunication(): void {
        this.communication.disconnect();
    }
}
