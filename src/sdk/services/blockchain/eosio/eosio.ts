import { APIClient, FetchProvider, NameType, API, PrivateKey } from '@wharfkit/antelope';
import { GetInfoResponse } from '@wharfkit/antelope/src/api/v1/types';
import fetch from 'cross-fetch';
import { getSettings } from '../../../util/settings';
import { throwError, SdkErrors } from '../../../util/errors';

let api: APIClient;

export async function getApi(): Promise<APIClient> {
    if (api) return api;

    const settings = getSettings();

    api = new APIClient({
        url: settings.blockchainUrl,
        provider: new FetchProvider(settings.blockchainUrl, { fetch }),
    });
    if (!api) throwError('Could not create API client', SdkErrors.CouldntCreateApi);
    return api;
}

export async function getChainInfo(): Promise<GetInfoResponse> {
    const api = await getApi();

    return (await api.v1.chain.get_info()) as unknown as GetInfoResponse;
}

export async function getAccount(account: NameType): Promise<API.v1.AccountObject> {
    try {
        const api = await getApi();

        return await api.v1.chain.get_account(account);
    } catch (e) {
        if (e.message === 'Account not found at /v1/chain/get_account') {
            throwError('Account "' + account.toString() + '" not found', SdkErrors.AccountDoesntExist);
        } else {
            throw e;
        }
    }
}

function getDefaultAntelopePrivateKey() {
    // if (isProduction()) {
    //     throw new Error('Cannot use default private key in production');
    // }

    return PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
}

// This is the default private key used by an Antelope node when it is first started
export const defaultAntelopePrivateKey = getDefaultAntelopePrivateKey();

export const defaultAntelopePublicKey = defaultAntelopePrivateKey.toPublic();
// PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63
