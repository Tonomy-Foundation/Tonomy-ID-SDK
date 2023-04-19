import { Checksum256, PrivateKey } from '@greymass/eosio';
import { JsKeyManager } from '../../src/sdk/storage/jsKeyManager';
import argon2 from 'argon2';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { createUserObject } from '../../src/sdk/controllers/user';
import { KeyManagerLevel } from '../../src/sdk/storage/keymanager';
import { randomBytes, generateRandomKeyPair } from '../../src/sdk/util/crypto';
import { setSettings } from '../../src/sdk';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';

const keyManager = new JsKeyManager();

setSettings({});
const user = createUserObject(keyManager, jsStorageFactory);

describe('Keymanager class', () => {
    test('KeyManagerLevel enum helpers', () => {
        const passwordLevel = KeyManagerLevel.PASSWORD;

        expect(passwordLevel).toBe('PASSWORD');
        expect(KeyManagerLevel.indexFor(passwordLevel)).toBe(0);
        expect(KeyManagerLevel.from('PASSWORD')).toBe(passwordLevel);
    });

    test('savePassword() is defined', () => {
        expect(user.savePassword).toBeDefined();
    });
});
