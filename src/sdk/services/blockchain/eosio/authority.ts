import { Name } from '@wharfkit/antelope';

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
        if (!Name.pattern.test(permission.actor)) throw new Error(`Invalid account name ${permission.actor}`);
        if (!Name.pattern.test(permission.permission))
            throw new Error(`Invalid account permission ${permission.permission}`);

        const accounts = [
            {
                permission,
                weight: 1,
            },
        ];

        return new this(1, [], accounts, []);
    }

    static fromAccountArray(accounts: string[], permission: string, threshold = 1): Authority {
        const authority = Authority.fromAccount({ actor: accounts[0], permission });

        if (accounts.length > 1) {
            for (const arg of accounts.slice(1)) {
                authority.addAccount({ actor: arg, permission });
            }
        }

        authority.setThreshold(threshold);
        authority.sort();

        return authority;
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

    addAccount(permission: { actor: string; permission: string }) {
        this.accounts.push({
            permission,
            weight: 1,
        });
    }

    addKey(key: string, weight: number) {
        this.keys.push({
            key,
            weight,
        });
    }

    setThreshold(threshold: number) {
        this.threshold = threshold;
    }

    /**
     * Sorts the authority weights in place, should be called before including the authority in a `updateauth` action or it might be rejected.
     */
    sort() {
        // This hack satisfies the constraints that authority weights, see: https://github.com/wharfkit/antelope/issues/8
        this.keys.sort((a, b) => String(a.key).localeCompare(String(b.key)));
        this.accounts.sort((a, b) => String(a.permission).localeCompare(String(b.permission)));
        this.waits.sort((a, b) => String(a.wait_sec).localeCompare(String(b.wait_sec)));
    }
}

export { Authority };
