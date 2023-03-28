import { sha256, randomString, randomBytes } from '../../src/util/crypto';
import {
    KeyManager,
    KeyManagerLevel,
    SignDataOptions,
    GetKeyOptions,
    StoreKeyOptions,
} from '../../src/services/keymanager';
import argon2 from 'argon2';
import { Bytes, Checksum256, KeyType, PrivateKey, PublicKey, Signature } from '@greymass/eosio';
import { createSigner } from '@tonomy/antelope-ssi-toolkit';
import { SdkErrors, throwError } from '../../src';

type KeyStorage = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    // TODO: check that this complies with the eosio checksum256 format
    hashedSaltedChallenge?: string;
    salt?: string;
};

export class JsKeyManager implements KeyManager {
    // TODO: use localStorage or sessionStorage in browser if available instead of keyStorage
    keyStorage: {
        [key in KeyManagerLevel]: KeyStorage;
    } = {} as any;

    // Creates a cryptographically secure Private key
    generateRandomPrivateKey(): PrivateKey {
        const bytes = randomBytes(32);

        return new PrivateKey(KeyType.K1, new Bytes(bytes));
    }

    async generatePrivateKeyFromPassword(
        password: string,
        salt?: Checksum256
    ): Promise<{ privateKey: PrivateKey; salt: Checksum256 }> {
        // creates a key based on secure (hashing) key generation algorithm like Argon2 or Scrypt
        if (!salt) salt = Checksum256.from(randomBytes(32));
        const hash = await argon2.hash(password, {
            salt: Buffer.from(salt.hexString, 'hex'),
            hashLength: 32,
            type: argon2.argon2id,
            raw: true,
            memoryCost: 16384,
            parallelism: 1,
        });
        const privateKey = new PrivateKey(KeyType.K1, new Bytes(hash));

        return {
            privateKey,
            salt,
        };
    }

    // creates a new secure key and returns the public key
    async storeKey(options: StoreKeyOptions): Promise<PublicKey> {
        const keyStore: KeyStorage = {
            privateKey: options.privateKey,
            publicKey: options.privateKey.toPublic(),
        };

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throw new Error('Challenge missing');
            keyStore.salt = randomString(32);
            keyStore.hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);
        }

        if (options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE) {
            localStorage.setItem('tonomy.id.' + KeyManagerLevel.BROWSER_LOCAL_STORAGE, options.privateKey.toString());
        }

        this.keyStorage[options.level] = keyStore;
        return keyStore.publicKey;
    }

    async signData(options: SignDataOptions): Promise<string | Signature> {
        if (!(options.level in this.keyStorage)) throw throwError('No key for this level', SdkErrors.KeyNotFound);

        const keyStore = this.keyStorage[options.level];

        if (options.level === KeyManagerLevel.PASSWORD || options.level === KeyManagerLevel.PIN) {
            if (!options.challenge) throw throwError('Challenge missing', SdkErrors.missingChallenge);

            const hashedSaltedChallenge = sha256(options.challenge + keyStore.salt);

            if (keyStore.hashedSaltedChallenge !== hashedSaltedChallenge)
                throw throwError('Challenge does not match', SdkErrors.PasswordInValid);
        }

        const privateKey = keyStore.privateKey;

        if (options.outputType === 'jwt') {
            if (typeof options.data !== 'string') throw throwError('data must be a string', SdkErrors.invalidDataType);
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
        if (options.level === KeyManagerLevel.BROWSER_LOCAL_STORAGE) {
            // use cache if available
            if (options.level in this.keyStorage) return this.keyStorage[options.level].publicKey;

            const data = localStorage.getItem('tonomy.id.' + options.level);

            if (!data) {
                throw new Error('No key for this level');
            }

            (this.keyStorage[options.level] as KeyStorage) = {
                privateKey: PrivateKey.fromString(data),
                publicKey: PrivateKey.fromString(data).toPublic(),
            };
            return PrivateKey.from(data).toPublic();
        } else {
            if (!(options.level in this.keyStorage)) throw new Error('No key for this level');

            const keyStore = this.keyStorage[options.level];

            if (options?.challenge) {
                const hashedSaltedChallenge = sha256(options?.challenge + keyStore.salt);

                if (hashedSaltedChallenge === keyStore.hashedSaltedChallenge) return keyStore.publicKey;
                else throw throwError('Pin is incorrect', SdkErrors.PinInValid);
            }

            return keyStore.publicKey;
        }
    }

    async removeKey(options: GetKeyOptions): Promise<void> {
        delete this.keyStorage[options.level];
    }
}
