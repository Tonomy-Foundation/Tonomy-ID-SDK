import { PrivateKey, Checksum256 } from '@wharfkit/antelope';
import { KeyManagerLevel } from '../storage/keymanager';
import { getTonomyContract } from '../services/blockchain/contracts/TonomyContract';
import { SdkErrors, throwError } from '../util/errors';
import { generateRandomKeyPair } from '../util/crypto';
import { ICreateAccountOptions, ILoginOptions, IUserAuthentication } from '../types/User';
import { getAccountInfo } from '../helpers/user';
import { UserBase } from './UserBase';

export class UserAuthorization extends UserBase implements IUserAuthentication {
    async savePassword(masterPassword: string, options: ICreateAccountOptions): Promise<void> {
        let privateKey: PrivateKey;
        let salt: Checksum256;

        if (options.salt) {
            salt = options.salt;
            const res = await options.keyFromPasswordFn(masterPassword, salt);

            privateKey = res.privateKey;
        } else {
            const res = await options.keyFromPasswordFn(masterPassword);

            privateKey = res.privateKey;
            salt = res.salt;
        }

        this.storage.salt = salt;
        await this.storage.salt; // wait for magic setter on storage

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PASSWORD,
            privateKey,
            challenge: masterPassword,
        });

        await this.keyManager.storeKey({
            level: KeyManagerLevel.ACTIVE,
            privateKey,
            // eventually this should be different than the password key, but for now Antelope protocol doesn't support it
            // ideally we would have a different structure, and active key will be linked to local key
        });
    }

    async checkPassword(password: string, options: ILoginOptions): Promise<boolean> {
        const username = await this.getAccountName();

        const idData = await getTonomyContract().getPerson(username);
        const salt = idData.password_salt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await this.keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await getAccountInfo(idData.account_name);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO: change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        return true;
    }

    async savePIN(pin: string): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.PIN,
            privateKey,
            challenge: pin,
        });
    }

    async checkPin(pin: string): Promise<boolean> {
        const pinKey = await this.keyManager.checkKey({
            level: KeyManagerLevel.PIN,
            challenge: pin,
        });

        if (!pinKey) throwError('Pin is incorrect', SdkErrors.PinInvalid);
        return true;
    }

    async saveFingerprint(): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.BIOMETRIC,
            privateKey,
        });
    }

    async saveLocal(): Promise<void> {
        const privateKey = generateRandomKeyPair().privateKey;

        await this.keyManager.storeKey({
            level: KeyManagerLevel.LOCAL,
            privateKey,
        });
    }
}
