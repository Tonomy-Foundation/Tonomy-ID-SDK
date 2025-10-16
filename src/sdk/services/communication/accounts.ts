import { getSettings } from '../../util/settings';
import { Checksum256Type, Name, PublicKeyType } from '@wharfkit/antelope';
import fetch from 'cross-fetch';
import { SdkErrors, throwError } from '../../util/errors';

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

    try {
        const response = await fetch(`${url}/v1/accounts/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const resData = await response.json();

        if (response.status !== 201) {
            if (response.status === 400) {
                return throwError(
                    'Communication Service error: ' + resData.message + ', errors: ' + resData.errors,
                    SdkErrors.AccountServiceError
                );
            }

            throwError(
                'Communication Service error: ' + resData.message + ', status: ' + response.status,
                SdkErrors.AccountServiceError
            );
        }

        return {
            transactionId: resData.transactionId,
            accountName: Name.from(resData.accountName),
        };
    } catch (e) {
        // try one more time when running locally, sometimes the service fails here
        if (
            e instanceof Error &&
            e.message.includes(
                'FetchError: request to http://localhost:5000/v1/accounts/create failed, reason: socket hang up'
            )
        ) {
            return createAccount(data);
        }

        throw e;
    }
}
