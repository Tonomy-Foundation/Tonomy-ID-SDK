declare type KeyWeight = {
    key: string;
    weight: number;
};
declare type PermissionWeight = {
    permission: {
        actor: string;
        permission: string;
    };
    weight: number;
};
declare type WaitWeight = {
    wait_sec: number;
    weight: number;
};
declare class Authority {
    threshold: number;
    keys: KeyWeight[];
    accounts: PermissionWeight[];
    waits: WaitWeight[];
    constructor(threshold: number, keys: KeyWeight[], accounts: PermissionWeight[], waits: WaitWeight[]);
    static fromKey(key: string): Authority;
    static fromAccount(permission: {
        actor: string;
        permission: string;
    }): Authority;
    addCodePermission(account: string): void;
}
export { Authority };
