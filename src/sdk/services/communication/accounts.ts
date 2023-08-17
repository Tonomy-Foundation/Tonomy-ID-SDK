import { getSettings } from '../../util/settings';
import { Checksum256Type, Name, PublicKeyType } from '@wharfkit/antelope';
import fetch from 'cross-fetch';

export type CreateAccountRequest = {
    usernameHash: Checksum256Type;
    publicKey: PublicKeyType;
    salt: Checksum256Type;
    captchaToken: string;
};

export type CreateAccountResponse = {
    transactionId: string;
    accountName: Name;
};

export async function createAccount(data: CreateAccountRequest): Promise<CreateAccountResponse> {
    const url = getSettings().accountsServiceUrl;

    const response = await fetch(`${url}/accounts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const resData = await response.json();

    return {
        transactionId: resData.transactionId,
        accountName: Name.from(resData.accountName),
    };
}
