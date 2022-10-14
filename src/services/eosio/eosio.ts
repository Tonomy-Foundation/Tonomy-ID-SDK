import { APIClient, FetchProvider } from "@greymass/eosio";
import fetch from 'cross-fetch';
import { getSettings } from "../../settings";

const settings = getSettings();

const api = new APIClient({
    url: settings.blockchainUrl,
    provider: new FetchProvider(settings.blockchainUrl, { fetch })
})

export { api };