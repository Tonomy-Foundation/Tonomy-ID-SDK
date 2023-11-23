import { IUser } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { UserAuthorization } from './UserAuthorization';
import { UserHCaptcha } from './UserHCaptcha';
import { UserOnboarding } from './UserOnboarding';
import { UserRequestsManager } from './UserRequestsManager';

export class User
    extends Mixin(UserBase, UserAuthorization, UserHCaptcha, UserOnboarding, UserRequestsManager)
    implements IUser {
    // No implementation needed. Stop prettier error
}
