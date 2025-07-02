import { IUser } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { UserAuthorization } from './UserAuthorization';
import { UserCaptcha } from './UserCaptcha';
import { UserOnboarding } from './UserOnboarding';
import { UserCommunication } from './UserCommunication';
import { UserRequestsManager } from './UserRequestsManager';
import { UserDataVault } from './UserDataVault';

export class User
    extends Mixin(
        UserBase,
        UserAuthorization,
        UserCaptcha,
        UserOnboarding,
        UserCommunication,
        UserRequestsManager,
        UserDataVault
    )
    implements IUser {
    // No implementation needed. Stop prettier error
}
