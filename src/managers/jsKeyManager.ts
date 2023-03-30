import { sha256, randomString } from '../util/crypto';
import {
    KeyManager,
    KeyManagerLevel,
    SignDataOptions,
    GetKeyOptions,
    StoreKeyOptions,
    CheckKeyOptions,
} from '../services/keymanager';
import { Checksum256, PrivateKey, PublicKey, Signature } from '@greymass/eosio';
import { createSigner } from '@tonomy/antelope-ssi-toolkit';
import { SdkErrors, throwError } from '../services/errors';
import { STORAGE_NAMESPACE } from '../services/storage';

const KEY_STORAGE_NAMESPACE = STORAGE_NAMESPACE + 'key.';

export type KeyStorage = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    // TODO: check that this complies with the eosio checksum256 format
    hashedSaltedChallenge?: string;
    salt?: string;
};

export class JsKeyManager implements KeyManager {
    keyStorage: {
        [key in KeyManagerLevel]: KeyStorage;
    } = {} as any;

    // creates a new secure key and returns the public key
    async storeKey(options: StoreKeyOptions): Promise<PublicKey> {
        const keyStore: KeyStorage = {
            privateKey: options.privateKey,
            publicKey: options.privateKey.toPublic(),
        };

        switch (options.level) {
        case KeyManagerLevel.LOCAL:
        case KeyManagerLevel.BIOMETRIC:
            break;
        case KeyManagerLevel.PASSWORD:
        case KeyManagerLevel.PIN:
            if (!options.challenge) throwError('Challenge missing', SdkErrors.MissingChallenge);
            keyStore.salt = randomString(32);
            keyStore.hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);
            break;
        case KeyManagerLevel.BROWSER_LOCAL_STORAGE:
            sessionStorage.setItem(KEY_STORAGE_NAMESPACE + options.level, JSON.stringify(keyStore));
            break;
        case KeyManagerLevel.BROWSER_SESSION_STORAGE:
            localStorage.setItem(KEY_STORAGE_NAMESPACE + options.level, JSON.stringify(keyStore));
            break;
        default:
            throwError('Invalid level', SdkErrors.InvalidKeyLevel);
        }

        this.keyStorage[options.level] = keyStore;
        return keyStore.publicKey;
    }

    private fetchKey(options: GetKeyOptions): KeyStorage {
        const keyStore = this.keyStorage[options.level];

        if (keyStore) return keyStore;

        if (
            options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE ||
            options.level === KeyManagerLevel.BROWSER_SESSION_STORAGE
        ) {
            const storage =
                options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE
                    ? localStorage.getItem(KEY_STORAGE_NAMESPACE + options.level)
                    : sessionStorage.getItem(KEY_STORAGE_NAMESPACE + options.level);

            if (!storage) throwError(`No key for level ${options.level}`, SdkErrors.KeyNotFound);
            const keystore = JSON.parse(storage);

            this.keyStorage[options.level] = keystore;

            return keystore;
        }

        throwError(`No key for level ${options.level}`, SdkErrors.KeyNotFound);
    }

    async signData(options: SignDataOptions): Promise<string | Signature> {
        const keyStore = this.fetchKey(options);

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throwError('Challenge missing', SdkErrors.MissingChallenge);
            const validChallenge = await this.checkKey({ level: options.level, challenge: options.challenge });

            if (!validChallenge && options.level === KeyManagerLevel.PASSWORD)
                throwError('Invalid password', SdkErrors.PasswordInvalid);
            if (!validChallenge && options.level === KeyManagerLevel.PIN)
                throwError('Invalid PIN', SdkErrors.PinInvalid);
        }

        const privateKey = keyStore.privateKey;

        if (options.outputType === 'jwt') {
            if (typeof options.data !== 'string') throw throwError('Data must be a string', SdkErrors.InvalidData);
            const signer = createSigner(privateKey as any);

            return (await signer(options.data)) as string;
        } else {
            let digest: Checksum256;

            if (typeof options.data === 'string') {
                digest = Checksum256.hash(Buffer.from(options.data));
            } else {
                digest = options.data as Checksum256;
            }

            const signature = privateKey.signDigest(digest);

            return signature;
        }
    }

    async getKey(options: GetKeyOptions): Promise<PublicKey> {
        const keyStore = this.fetchKey(options);

        return keyStore.publicKey;
    }

    async checkKey(options: CheckKeyOptions): Promise<boolean> {
        const keyStore = this.fetchKey(options);

        if (options.level === KeyManagerLevel.PIN || options.level === KeyManagerLevel.PASSWORD) {
            if (!options.challenge) throwError('Challenge is missing', SdkErrors.MissingChallenge);

            const hashedSaltedChallenge = sha256(options?.challenge + keyStore.salt);

            return hashedSaltedChallenge === keyStore.hashedSaltedChallenge;
        } else throw throwError('Invalid Level', SdkErrors.InvalidKeyLevel);
    }

    async removeKey(options: GetKeyOptions): Promise<void> {
        delete this.keyStorage[options.level];

        if (
            options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE ||
            options.level === KeyManagerLevel.BROWSER_SESSION_STORAGE
        ) {
            options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE
                ? localStorage.removeItem(KEY_STORAGE_NAMESPACE + options.level)
                : sessionStorage.removeItem(KEY_STORAGE_NAMESPACE + options.level);
        }
    }
}
