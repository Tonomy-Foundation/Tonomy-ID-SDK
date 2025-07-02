import { jsStorageFactory } from './jsstorage';
import { generatePrivateKeyFromPassword, getSigner } from './keys';
import { getTonomyContract, JsKeyManager, KeyManager, createUserObject } from '../../sdk';
import { CreateAccountRequest, CreateAccountResponse } from '../../sdk/services/communication/accounts';
import * as accounts from '../../sdk/services/communication/accounts';
import { Name } from '@wharfkit/antelope';
import { setupDatabase } from '../../../test/setup';

const defaultCreateAccount = accounts.createAccount;

// Mock the createAccount function to not directly create the account, and thus bypass the hCaptcha requirement
// createAccount() is called during user.createPerson()
export function mockCreateAccount() {
    console.log('Mocking createAccount()');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accounts.createAccount = async function (data: CreateAccountRequest): Promise<CreateAccountResponse> {
        console.log('Calling mocked createAccount()');

        const res = await getTonomyContract().newperson(
            data.usernameHash.toString(),
            data.publicKey.toString(),
            data.salt.toString(),
            getSigner()
        );

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        const accountName = Name.from(newAccountAction.data.name);

        return {
            transactionId: res.transaction_id,
            accountName,
        };
    };
}

export function restoreCreateAccountFromMock() {
    console.log('Restoring createAccount() to original function');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accounts.createAccount = defaultCreateAccount;
}

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const dataSource = await setupDatabase();
    const user = await createUserObject(auth, jsStorageFactory, dataSource);

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

    await user.createPerson();
    console.log('New user:', (await user.getUsername()).toString());

    return { user, password, auth };
}
