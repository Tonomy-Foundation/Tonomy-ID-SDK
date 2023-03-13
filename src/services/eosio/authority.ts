type KeyWeight = { key: string; weight: number };
type PermissionWeight = {
    permission: {
        actor: string;
        permission: string;
    };
    weight: number;
};
type WaitWeight = { wait_sec: number; weight: number };

class Authority {
    threshold: number;

    keys: KeyWeight[];

    accounts: PermissionWeight[];

    waits: WaitWeight[];

    constructor(threshold: number, keys: KeyWeight[], accounts: PermissionWeight[], waits: WaitWeight[]) {
        this.threshold = threshold;
        this.keys = keys;
        this.accounts = accounts;
        this.waits = waits;
    }

    static fromKey(key: string) {
        const keys = [
            {
                key,
                weight: 1,
            },
        ];
        return new this(1, keys, [], []);
    }

    static fromAccount(permission: { actor: string; permission: string }) {
        const accounts = [
            {
                permission,
                weight: 1,
            },
        ];
        return new this(1, [], accounts, []);
    }

    // to add the eosio.code authority for smart contracts
    // https://developers.eos.io/welcome/v2.1/smart-contract-guides/adding-inline-actions#step-1-adding-eosiocode-to-permissions
    addCodePermission(account: string) {
        this.accounts.push({
            permission: {
                actor: account,
                permission: 'eosio.code',
            },
            weight: 1,
        });
    }
}

export { Authority };
