import { APIClient, FetchProvider } from '@greymass/eosio';
import fetch from 'cross-fetch';
import { getSettings } from '../../settings';
import { throwError, SdkErrors } from '../errors';

let api: APIClient;

export async function getApi(): Promise<APIClient> {
    if (api) return api;

    const settings = await getSettings();
    api = new APIClient({
        url: settings.blockchainUrl,
        provider: new FetchProvider(settings.blockchainUrl, { fetch }),
    });
    if (!api) throwError('Could not create API client', SdkErrors.CouldntCreateApi);
    return api;
}
