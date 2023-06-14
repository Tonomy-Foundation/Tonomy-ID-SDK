import { jsStorageFactory } from './jsstorage';
import { generatePrivateKeyFromPassword } from './keys';
import { JsKeyManager, KeyManager, createUserObject } from '../../sdk';

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

    await user.createPerson();
    console.log('Created user:', username);

    return { user, password, auth };
}
