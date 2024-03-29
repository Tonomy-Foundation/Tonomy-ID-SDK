import { IUser } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { UserAuthorization } from './UserAuthorization';
import { UserCaptcha } from './UserCaptcha';
import { UserOnboarding } from './UserOnboarding';
import { UserRequestsManager } from './UserRequestsManager';
import { UserCommunication } from './UserCommunication';

export class User
    extends Mixin(UserBase, UserAuthorization, UserCaptcha, UserOnboarding, UserCommunication, UserRequestsManager)
    implements IUser {
    // No implementation needed. Stop prettier error
}
