import { API } from '@wharfkit/antelope';
import { KeyManagerLevel } from '../storage/keymanager';
import { PersonData, getTonomyContract } from '../services/blockchain/contracts/TonomyContract';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { getChainId } from '../services/blockchain/eosio/eosio';
import { SdkErrors, throwError, isErrorCode } from '../util/errors';
import { AccountType, TonomyUsername } from '../util/username';
import { getSettings } from '../util/settings';
import { createAccount } from '../services/communication/accounts';
import { UserStatusEnum } from '../types/UserStatusEnum';
import { ILoginOptions, IUserOnboarding } from '../types/User';
import { getAccountInfo } from '../helpers/user';
import { UserDataVault } from './UserDataVault';
import Debug from 'debug';
import { createAntelopeDid } from '../util';

const debug = Debug('tonomy-sdk:controllers:UserOnboarding');

export class UserOnboarding extends UserDataVault implements IUserOnboarding {
    private chainID!: string;

    private validateUsername(username: string): void {
        if (typeof username !== 'string' || username.length === 0)
            throwError('Username must be a string', SdkErrors.InvalidData);

        // Allow only letters, numbers, underscore and dash (1 to 50 characters)
        if (!/^[A-Za-z0-9_-]{1,100}$/g.test(username))
            throwError('Username contains invalid characters', SdkErrors.InvalidUsername);
    }

    private async createDid(): Promise<string> {
        if (!this.chainID) {
            this.chainID = await getChainId();
        }

        const accountName = await this.getAccountName();

        this.storage.did = await createAntelopeDid(accountName.toString());
        await this.storage.did;
        return this.storage.did;
    }

    async login(username: TonomyUsername, password: string, options: ILoginOptions): Promise<PersonData> {
        this.validateUsername(username.getBaseUsername());
        const { keyManager } = this;

        const idData = await getTonomyContract().getPerson(username);
        const salt = idData.passwordSalt;

        await this.savePassword(password, { ...options, salt });
        const passwordKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });

        const accountData = await getAccountInfo(idData.accountName);
        const onchainKey = accountData.getPermission('owner').required_auth.keys[0].key; // TODO: change to active/other permissions when we make the change

        if (passwordKey.toString() !== onchainKey.toString())
            throwError('Password is incorrect', SdkErrors.PasswordInvalid);

        this.storage.accountName = idData.accountName;
        this.storage.username = username;
        this.storage.status = UserStatusEnum.LOGGING_IN;

        await this.storage.accountName;
        await this.storage.username;
        await this.storage.status;
        await this.createDid();

        return idData;
    }

    async isLoggedIn(): Promise<boolean> {
        return (await this.getStatus()) === UserStatusEnum.READY;
    }

    async createPerson(): Promise<void> {
        const { keyManager } = this;
        const username = await this.getUsername();

        const usernameHash = username.usernameHash;

        const publicKey = await keyManager.getKey({
            level: KeyManagerLevel.PASSWORD,
        });
        const salt = await this.storage.salt;
        const captchaToken = await this.storage.captchaToken;

        try {
            const res = await createAccount({
                usernameHash: usernameHash,
                publicKey,
                salt,
                captchaToken,
            });

            this.storage.accountName = res.accountName;
        } catch (e) {
            if (e.status === 400 && e.message === 'Username is taken') {
                throwError('Username is taken', SdkErrors.UsernameTaken);
            }

            throw e;
        }

        await this.storage.accountName;

        this.storage.status = UserStatusEnum.CREATING_ACCOUNT;
        await this.storage.status;
        await this.createDid();

        debug('Created account', {
            accountName: (await this.getAccountName()).toString(),
            username: (await this.getUsername()).getBaseUsername(),
            did: await this.getDid(),
        });
    }

    async saveUsername(username: string): Promise<void> {
        this.validateUsername(username);

        let user: API.v1.AccountObject;
        const fullUsername = TonomyUsername.fromUsername(username, AccountType.PERSON, getSettings().accountSuffix);

        try {
            user = await getAccountInfo(fullUsername);
            if (user) throwError('Username is taken', SdkErrors.UsernameTaken);
        } catch (e) {
            if (!isErrorCode(e, SdkErrors.UsernameNotFound)) {
                throw e;
            }
        }

        this.storage.username = fullUsername;
        await this.storage.username;
    }

    async usernameExists(username: string): Promise<boolean> {
        const fullUsername = TonomyUsername.fromUsername(username, AccountType.PERSON, getSettings().accountSuffix);

        try {
            await getAccountInfo(fullUsername);
            return true;
        } catch (e) {
            if (isErrorCode(e, SdkErrors.UsernameNotFound)) {
                return false;
            }

            throw e;
        }
    }

    async updateKeys(password: string): Promise<void> {
        const status = await this.getStatus();

        if (status === UserStatusEnum.DEACTIVATED) {
            throwError("Can't update keys for deactivated user", SdkErrors.UserDeactivated);
        }

        const { keyManager } = this;

        // TODO:
        // use status in smart contract to lock the account till finished creating
        const keys = {} as {
            PIN: string;
            BIOMETRIC: string;
            LOCAL: string;
        };

        try {
            const pinKey = await keyManager.getKey({ level: KeyManagerLevel.PIN });

            keys.PIN = pinKey.toString();
        } catch (e) {
            if (!isErrorCode(e, SdkErrors.KeyNotFound)) throw e;
        }

        try {
            const biometricKey = await keyManager.getKey({ level: KeyManagerLevel.BIOMETRIC });

            keys.BIOMETRIC = biometricKey.toString();
        } catch (e) {
            if (!isErrorCode(e, SdkErrors.KeyNotFound)) throw e;
        }

        try {
            const localKey = await keyManager.getKey({ level: KeyManagerLevel.LOCAL });

            keys.LOCAL = localKey.toString();
        } catch (e) {
            if (!isErrorCode(e, SdkErrors.KeyNotFound)) throw e;
        }

        const signer = createKeyManagerSigner(keyManager, KeyManagerLevel.PASSWORD, password);
        const accountName = await this.getAccountName();

        await getTonomyContract().updateKeysPerson(accountName, keys, signer);

        this.storage.status = UserStatusEnum.READY;
        await this.storage.status;
    }

    async checkKeysStillValid(): Promise<boolean> {
        // Account been created, or has not finished being created yet
        if ((await this.getStatus()) !== UserStatusEnum.READY)
            throwError('User is not ready', SdkErrors.AccountDoesntExist);

        const accountInfo = await getAccountInfo(await this.storage.accountName);

        const checkPairs = [
            {
                level: KeyManagerLevel.PIN,
                permission: 'pin',
            },
            {
                level: KeyManagerLevel.BIOMETRIC,
                permission: 'biometric',
            },
            {
                level: KeyManagerLevel.LOCAL,
                permission: 'local',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'active',
            },
            {
                level: KeyManagerLevel.PASSWORD,
                permission: 'owner',
            },
        ];

        for (const pair of checkPairs) {
            let localKey;

            try {
                localKey = await this.keyManager.getKey({ level: pair.level });
            } catch (e) {
                localKey = null;
            }

            let blockchainPermission;

            try {
                blockchainPermission = accountInfo.getPermission(pair.permission);
            } catch (e) {
                blockchainPermission = null;
            }

            if (!localKey && blockchainPermission) {
                // User probably logged into another device and finished create account flow there
                throwError(
                    `${pair.level} key was not found in the keyManager, but was found on the blockchain`,
                    SdkErrors.KeyNotFound
                );
            }

            if (localKey && !blockchainPermission) {
                // User probably hasn't finished create account flow yet
                throwError(
                    `${pair.level} keys was not found on the blockchain, but was found in the keyManager`,
                    SdkErrors.KeyNotFound
                );
            }

            if (
                localKey &&
                blockchainPermission &&
                localKey.toString() !== blockchainPermission.required_auth.keys[0].key.toString()
            ) {
                // User has logged in on another device
                throwError(`${pair.level} keys do not match`, SdkErrors.KeyNotFound);
            }
        }

        return true;
    }

    async logout(): Promise<void> {
        // remove all keys
        for (const level of Object.keys(KeyManagerLevel)) {
            try {
                await this.keyManager.getKey({ level: KeyManagerLevel.from(level) });
                this.keyManager.removeKey({ level: KeyManagerLevel.from(level) });
            } catch (e) {
                if (!isErrorCode(e, [SdkErrors.KeyNotFound, SdkErrors.InvalidKeyLevel])) throw e;
            }
        }

        // clear storage data
        this.storage.clear();

        this.disconnectCommunication();
    }

    async checkTableExists(tableName: string) {
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            const result = await queryRunner.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [
                tableName,
            ]);

            debug(`Table check result for ${tableName}:`, result);
            return result.length > 0;
        } finally {
            await queryRunner.release();
        }
    }

    async initializeKycDataSource(): Promise<void> {
        if (this.dataSource && !this.dataSource.isInitialized) {
            await this.dataSource.initialize();
            await this.dataSource.runMigrations();
        }

        const identityVerificationTableExists = await this.checkTableExists('IdentityVerificationStorage');

        if (!identityVerificationTableExists) {
            await this.dataSource.synchronize();
        }
    }

    async initializeFromStorage(): Promise<boolean> {
        const accountName = await this.getAccountName();

        await this.initializeKycDataSource();

        if (accountName) {
            return await this.checkKeysStillValid();
        } else {
            throwError('Account "' + accountName + '" not found', SdkErrors.AccountDoesntExist);
        }
    }
}
