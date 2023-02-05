import { randomString, KeyManager, createUserObject, App } from 'tonomy-id-sdk';
import { JsKeyManager } from 'tonomy-id-sdk/test/services/jskeymanager';
import { jsStorageFactory } from 'tonomy-id-sdk/test/services/jsstorage';

import { privateKey } from './eosio';

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    await user.saveUsername(username);
    await user.savePassword(password);

    await user.createPerson();

    return { user, password, auth };
}

export async function createRandomID() {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    const username = randomString(8);
    const password = randomString(8) + 'aA0!';
    const pin = Math.floor(Math.random() * 5).toString();

    await user.saveUsername(username);
    await user.savePassword(password);
    await user.savePIN(pin);
    await user.saveFingerprint();
    await user.saveLocal();

    await user.createPerson();
    await user.updateKeys(password);

    return { user, password, pin, auth };
}

export async function createRandomApp(logoUrl?: string, origin?: string): Promise<App> {
    const name = randomString(8);
    const description = randomString(80);
    if (!origin) origin = 'http://localhost:3000';
    if (!logoUrl) logoUrl = 'http://localhost:3000/logo.png';

    return await App.create({
        usernamePrefix: randomString(8),
        appName: name,
        description: description,
        logoUrl,
        origin,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publicKey: privateKey.toPublic() as any,
    });
}
