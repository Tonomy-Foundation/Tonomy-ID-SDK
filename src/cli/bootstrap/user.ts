import { jsStorageFactory } from './jsstorage';
import { generatePrivateKeyFromPassword } from './keys';
import { JsKeyManager, KeyManager, createUserObject } from '../../sdk';
import { CreateAccountRequest, CreateAccountResponse } from '../../sdk/services/communication/accounts';
import * as accounts from '../../sdk/services/communication/accounts';
import { Name } from '@wharfkit/antelope';

// Mock the createAccount function to not directly create the account, and thus bypass the hCaptcha requirement
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
accounts.createAccount = async function (data: CreateAccountRequest): Promise<CreateAccountResponse> {
    console.log('Calling mocked createAccount()');
    return {
        transactionId: 'transactionId',
        accountName: Name.from('accountName'),
    };
};

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

    await user.createPerson(); // TODO NEED TO SOLVE THIS ONE!
    console.log('Created user:', username);

    return { user, password, auth };
}
