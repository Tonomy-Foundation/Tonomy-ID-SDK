import { copyObject } from "../../util/objets";

type Authority = {
    threshold: number;
    keys: { key: string, weight: number }[];
    accounts: {
        permission: {
            actor: string, permission: string
        },
        weight: number
    }[];
    waits: { wait_sec: number, weight: number }[];

    // TODO add functions as methods of Authority here instead of global functions
}

function createKeyAuthoriy(key: string): Authority {
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

function createDelegatedAuthority(permission: { actor: string, permission: string }): Authority {
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

function addCodePermission(authority: any, account: string): Authority {
    const newAuth = copyObject(authority);
    newAuth.accounts.push({
        permission: {
            actor: account,
            permission: "eosio.code"
        },
        weight: 1
    })
    return newAuth;
}

export { createDelegatedAuthority, createKeyAuthoriy, addCodePermission, Authority };