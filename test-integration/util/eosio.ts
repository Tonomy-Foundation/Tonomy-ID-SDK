import { APIClient, FetchProvider, PrivateKey } from '@greymass/eosio';
import fetch from 'node-fetch';

const privateKey = PrivateKey.from('PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V');
const publicKey = privateKey.toPublic();
// PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63

const api = new APIClient({
    url: 'http://localhost:8888',
    provider: new FetchProvider('http://localhost:8888', { fetch }),
});

export { api, privateKey, publicKey };
