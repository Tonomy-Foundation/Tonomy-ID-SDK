declare enum AccountType {
    PERSON = "PERSON",
    ORG = "ORG",
    APP = "APP",
    GOV = "GOV"
}
declare namespace AccountType {
    function indexFor(value: AccountType): number;
    function from(value: number | string): AccountType;
    function getPreSuffix(value: AccountType): string;
}
export { AccountType };
export declare class TonomyUsername {
    username?: string;
    usernameHash: string;
    constructor(username: string, hashed?: boolean);
    static fromHash(usernameHash: string): TonomyUsername;
    static fromUsername(username: string, type: AccountType, suffix: string): TonomyUsername;
    static fromFullUsername(username: string): TonomyUsername;
    getBaseUsername(): string | undefined;
}
