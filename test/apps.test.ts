import { PrivateKey, PublicKey } from '@greymass/eosio';
import { onPressLogin } from '../src/apps';
import { generateRandomKeyPair } from '../src/util/crypto';

describe('logging in', () => {
    it('generates random key pair', () => {
        const { privateKey, publicKey } = generateRandomKeyPair();
        expect(privateKey).toBeInstanceOf(PrivateKey);
        expect(publicKey).toBeInstanceOf(PublicKey);
    });

    it('on press button', async () => {
        const jwt = await onPressLogin(window);
        expect(jwt).toBeDefined();
    });
});
