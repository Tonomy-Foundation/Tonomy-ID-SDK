import { IUserHCaptcha } from '../types/User';
import { UserBase } from './UserBase';

export abstract class UserHCaptcha extends UserBase implements IUserHCaptcha {
    async getCaptchaToken(): Promise<string> {
        return await this.storage.captchaToken;
    }

    async saveCaptchaToken(captchaToken: string) {
        this.storage.captchaToken = captchaToken;
        await this.storage.captchaToken;
    }
}
