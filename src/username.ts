import { sha256 } from './util/crypto';

enum AccountType {
    PERSON = 'PERSON',
    ORG = 'ORG',
    APP = 'APP',
    GOV = 'GOV',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace AccountType {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: AccountType): number {
        return Object.keys(AccountType).indexOf(value);
    }

    /*
     * Creates an AccountType from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): AccountType {
        let index: number;
        if (typeof value !== 'number') {
            index = AccountType.indexFor(value as AccountType);
        } else {
            index = value;
        }
        return Object.values(AccountType)[index] as AccountType;
    }

    export function getPreSuffix(value: AccountType): string {
        return value.toLowerCase();
    }
}

export { AccountType };

export class TonomyUsername {
    username: string;
    usernameHash: string;

    constructor(username: string, type: AccountType, suffix: string) {
        this.username = username + '.' + AccountType.getPreSuffix(type) + suffix;
        this.usernameHash = sha256(this.username);
    }
}
