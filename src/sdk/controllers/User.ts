import { IUserAuthentication, IUserBase, IUserHCaptcha, IUserOnboarding, IUserRequestsManager } from '../types/User';
import { Mixin } from 'ts-mixer';
import { UserBase } from './UserBase';
import { AbstractUserAuthorization } from './UserAuthorization';
import { AbstractUserHCaptcha } from './UserHCaptcha';
import { AbstractUserOnboarding } from './UserOnboarding';
import { AbstractUserRequestsManager } from './UserRequestsManager';

export class User
    extends Mixin(
        UserBase,
        AbstractUserAuthorization,
        AbstractUserHCaptcha,
        AbstractUserOnboarding,
        AbstractUserRequestsManager
    )
    implements IUserBase, IUserAuthentication, IUserHCaptcha, IUserOnboarding, IUserRequestsManager { }
