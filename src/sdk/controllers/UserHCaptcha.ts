import { AbstractUserBase, IUserHCaptcha } from '../types/User';

export abstract class AbstractUserHCaptcha extends AbstractUserBase implements IUserHCaptcha {
    async getCaptchaToken(): Promise<string> {
        return await this.storage.captchaToken;
    }

    async saveCaptchaToken(captchaToken: string) {
        this.storage.captchaToken = captchaToken;
        await this.storage.captchaToken;
    }
}
