import { IUser } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { UserAuthorization } from './UserAuthorization';
import { UserCaptcha } from './UserCaptcha';
import { UserOnboarding } from './UserOnboarding';
import { UserRequestsManager } from './UserRequestsManager';
import { UserCommunication } from './UserCommunication';
import { DataSource } from 'typeorm';
import { Communication } from '../services/communication/communication';

export class User
    extends Mixin(UserBase, UserAuthorization, UserCaptcha, UserOnboarding, UserCommunication, UserRequestsManager)
    implements IUser {

    private _isInitialized = false;

    // Initialize the user data vault
    public async initialize(dataSource: DataSource, communication: Communication): Promise<void> {
        await this.initializeDataVault(dataSource, communication);
        this._isInitialized = true;
    }

    // Check if the user is properly initialized
    public isInitialized(): boolean {
        return this._isInitialized;
    }

}
