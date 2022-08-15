import { APIClient, FetchProvider, PrivateKey } from "@greymass/eosio";
import fetch from 'cross-fetch';

const privateKey = PrivateKey.from("PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V");
const publicKey = privateKey.toPublic();
// PUB_K1_6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5BoDq63

const api = new APIClient({
    url: "http://localhost:8888",
    provider: new FetchProvider("http://localhost:8888", { fetch })
})

function createKeyAuthoriy(key: string) {
    return {
        threshold: 1,
        keys: [{
            key,
            weight: 1
        }],
        accounts: [],
        waits: []
    }
}

function createDelegatedAuthority(permission: { actor: string, permission: string }) {
    return {
        threshold: 1,
        keys: [],
        accounts: [{
            permission,
            weight: 1
        }],
        waits: []
    }
}

function addCodePermission(authority: any, account: string) {
    // TODO this modifies the argument. need to create copy and return a new object
    authority.accounts.push({
        permission: {
            actor: account,
            permission: "eosio.code"
        },
        weight: 1
    })
    return authority;
}

export { api, privateKey, publicKey, createDelegatedAuthority, createKeyAuthoriy, addCodePermission };