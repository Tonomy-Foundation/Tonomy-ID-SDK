import { IUser } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { UserAuthorization } from './UserAuthorization';
import { UserCaptcha } from './UserCaptcha';
import { UserOnboarding } from './UserOnboarding';
import { UserRequestsManager } from './UserRequestsManager';
import { UserDataVault } from '../storage/dataVault/UserDataVault';

export class User
    extends Mixin(UserBase, UserAuthorization, UserCaptcha, UserOnboarding, UserRequestsManager, UserDataVault)
    implements IUser {
    // No implementation needed. Stop prettier error
}
