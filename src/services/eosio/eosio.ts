import { APIClient, FetchProvider } from '@greymass/eosio';
import { GetInfoResponse } from '@greymass/eosio/src/api/v1/types';
import fetch from 'cross-fetch';
import { getSettings } from '../../settings';
import { throwError, SdkErrors } from '../errors';

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
