
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

export { createDelegatedAuthority, createKeyAuthoriy, addCodePermission };