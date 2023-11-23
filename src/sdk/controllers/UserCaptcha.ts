import { IUserCaptcha } from '../types/User';
import { UserBase } from './UserBase';

export abstract class UserCaptcha extends UserBase implements IUserCaptcha {
    async getCaptchaToken(): Promise<string> {
        return await this.storage.captchaToken;
    }

    async saveCaptchaToken(captchaToken: string) {
        this.storage.captchaToken = captchaToken;
        await this.storage.captchaToken;
    }
}
