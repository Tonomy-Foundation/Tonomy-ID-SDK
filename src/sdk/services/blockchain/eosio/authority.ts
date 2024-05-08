import { Name, NameType } from '@wharfkit/antelope';
import BN from 'bn.js';

type KeyWeight = { key: string; weight: number };
type PermissionWeight = {
    permission: {
        actor: string;
        permission: string;
    };
    weight: number;
};
type WaitWeight = { wait_sec: number; weight: number };

export class Authority {
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

        this.sort();
    }

    addAccount(permission: { actor: string; permission: string }) {
        this.accounts.push({
            permission,
            weight: 1,
        });

        this.sort();
    }

    addKey(key: string, weight: number) {
        this.keys.push({
            key,
            weight,
        });

        this.sort();
    }

    setThreshold(threshold: number) {
        this.threshold = threshold;
    }

    /**
     * Sorts the authority weights in place, should be called before including the authority in a `updateauth` action or it might be rejected.
     */
    sort() {
        this.keys.sort((a, b) => String(a.key).localeCompare(String(b.key)));
        this.accounts.sort((a, b) => comparePermissionLevelWeight(a, b));
        this.waits.sort((a, b) => a.wait_sec - b.wait_sec);
    }
}

function comparePermissionLevelWeight(lhs: PermissionWeight, rhs: PermissionWeight): number {
    if (compareNameType(lhs.permission.actor, rhs.permission.actor) !== 0) {
        return compareNameType(lhs.permission.actor, rhs.permission.actor);
    }

    if (compareNameType(lhs.permission.permission, rhs.permission.permission) !== 0) {
        return compareNameType(lhs.permission.permission, rhs.permission.permission);
    }

    return lhs.weight - rhs.weight;
}

function compareNameType(lhs: NameType, rhs: NameType): number {
    const lhsValue: BN = Name.from(lhs).value.value;
    const rhsValue: BN = Name.from(rhs).value.value;

    return lhsValue.cmp(rhsValue);
}
