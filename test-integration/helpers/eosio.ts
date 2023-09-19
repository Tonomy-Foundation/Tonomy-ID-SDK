import { APIClient, FetchProvider } from '@wharfkit/antelope';
import fetch from 'cross-fetch';
import { getSettings } from '../../src/sdk';

export const api = new APIClient({
    url: getSettings().blockchainUrl,
    provider: new FetchProvider(getSettings().blockchainUrl, { fetch }),
});
