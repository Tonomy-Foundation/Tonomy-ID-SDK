import { jsStorageFactory } from './jsstorage';
import { generatePrivateKeyFromPassword, signer } from './keys';
import { IDContract, JsKeyManager, KeyManager, createUserObject } from '../../sdk';
import { CreateAccountRequest, CreateAccountResponse } from '../../sdk/services/communication/accounts';
import * as accounts from '../../sdk/services/communication/accounts';
import { Name } from '@wharfkit/antelope';

const idContract = IDContract.Instance;

const defaultCreateAccount = accounts.createAccount;

// Mock the createAccount function to not directly create the account, and thus bypass the hCaptcha requirement
export function mockCreateAccount() {
    console.log('Mocking createAccount()');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accounts.createAccount = async function (data: CreateAccountRequest): Promise<CreateAccountResponse> {
        console.log('Calling mocked createAccount()');

        const res = await idContract.newperson(
            data.usernameHash.toString(),
            data.publicKey.toString(),
            data.salt.toString(),
            signer
        );

        const newAccountAction = res.processed.action_traces[0].inline_traces[0].act;

        const accountName = Name.from(newAccountAction.data.name);

        return {
            transactionId: res.transaction_id,
            accountName,
        };
    };
}

export function restoreCreateAccount() {
    console.log('Restoring createAccount()');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accounts.createAccount = defaultCreateAccount;
}

export async function createUser(username: string, password: string) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });

    await user.createPerson(); // TODO NEED TO SOLVE THIS ONE!
    console.log('Created user:', username);

    return { user, password, auth };
}
