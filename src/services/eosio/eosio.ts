import { APIClient, FetchProvider } from "@greymass/eosio";
import fetch from 'cross-fetch';

const api = new APIClient({
    url: "http://localhost:8888",
    provider: new FetchProvider("http://localhost:8888", { fetch })
})

export { api };