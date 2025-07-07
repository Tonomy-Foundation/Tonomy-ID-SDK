import { sha256, randomString, createSigner } from '../util/crypto';
import {
    KeyManager,
    KeyManagerLevel,
    SignDataOptions,
    GetKeyOptions,
    StoreKeyOptions,
    CheckKeyOptions,
} from './keymanager';
import { Checksum256, PrivateKey, PublicKey, Signature } from '@wharfkit/antelope';
import { SdkErrors } from '../util/errors';
import { STORAGE_NAMESPACE } from './storage';

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
        StoreKeyOptions.validate(options);

        const keyStore: KeyStorage = {
            privateKey: options.privateKey,
            publicKey: options.privateKey.toPublic(),
        };

        switch (options.level) {
            case KeyManagerLevel.ACTIVE:
            case KeyManagerLevel.LOCAL:
            case KeyManagerLevel.BIOMETRIC:
                break;
            case KeyManagerLevel.PASSWORD:
            case KeyManagerLevel.PIN:
                if (!options.challenge) throw new Error(`${SdkErrors.MissingChallenge}: Challenge missing`);
                keyStore.salt = randomString(32);
                keyStore.hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);
                break;
            case KeyManagerLevel.BROWSER_LOCAL_STORAGE:
                localStorage.setItem(KEY_STORAGE_NAMESPACE + options.level, JSON.stringify(keyStore));
                break;
            case KeyManagerLevel.BROWSER_SESSION_STORAGE:
                sessionStorage.setItem(KEY_STORAGE_NAMESPACE + options.level, JSON.stringify(keyStore));
                break;
            default:
                throw new Error(`${SdkErrors.InvalidKeyLevel}: Invalid level`);
        }

        this.keyStorage[options.level] = keyStore;
        return keyStore.publicKey;
    }

    private fetchKey(options: GetKeyOptions): KeyStorage {
        GetKeyOptions.validate(options);
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

            if (!storage) throw new Error(`${SdkErrors.KeyNotFound}: No key for level ${options.level}`);
            const keyStore = JSON.parse(storage);

            this.keyStorage[options.level] = {
                privateKey: PrivateKey.from(keyStore.privateKey),
                publicKey: PublicKey.from(keyStore.publicKey),
            };
            if (keyStore.hashedSaltedChallenge)
                this.keyStorage[options.level].hashedSaltedChallenge = keyStore.hashedSaltedChallenge;
            if (keyStore.salt) this.keyStorage[options.level].salt = keyStore.salt;

            return this.keyStorage[options.level];
        }

        throw new Error(`${SdkErrors.KeyNotFound}: No key for level ${options.level}`);
    }

    async signData(options: SignDataOptions): Promise<string | Signature> {
        SignDataOptions.validate(options);
        const keyStore = this.fetchKey(options);

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throw new Error(`${SdkErrors.MissingChallenge}: Challenge missing`);
            const validChallenge = await this.checkKey({ level: options.level, challenge: options.challenge });

            if (!validChallenge && options.level === KeyManagerLevel.PASSWORD)
                throw new Error(`${SdkErrors.PasswordInvalid}: Invalid password`);
            if (!validChallenge && options.level === KeyManagerLevel.PIN)
                throw new Error(`${SdkErrors.PinInvalid}: Invalid PIN`);
        }

        const privateKey = keyStore.privateKey;

        if (options.outputType === 'jwt') {
            if (typeof options.data !== 'string') throw new Error(`${SdkErrors.InvalidData}: Data must be a string`);
            const signer = createSigner(privateKey);

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
        GetKeyOptions.validate(options);
        const keyStore = this.fetchKey(options);

        return keyStore.publicKey;
    }

    async checkKey(options: CheckKeyOptions): Promise<boolean> {
        CheckKeyOptions.validate(options);
        const keyStore = this.fetchKey(options);

        if (options.level === KeyManagerLevel.PIN || options.level === KeyManagerLevel.PASSWORD) {
            if (!options.challenge) throw new Error(`${SdkErrors.MissingChallenge}: Challenge is missing`);

            const hashedSaltedChallenge = sha256(options?.challenge + keyStore.salt);

            return hashedSaltedChallenge === keyStore.hashedSaltedChallenge;
        } else throw new Error(`${SdkErrors.InvalidKeyLevel}: Invalid Level`);
    }

    async removeKey(options: GetKeyOptions): Promise<void> {
        GetKeyOptions.validate(options);
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
