import { sha256 } from './crypto';
import { SdkErrors, throwError } from './errors';
import { Serializable } from './serializable';

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

export class TonomyUsername implements Serializable {
    username?: string;
    usernameHash: string;

    constructor(username: string, hashed = false) {
        if (hashed) {
            this.usernameHash = username;
        } else {
            this.username = username;
            this.usernameHash = sha256(this.username);
        }
    }

    static fromHash(usernameHash: string): TonomyUsername {
        return new TonomyUsername(usernameHash, true);
    }

    static fromUsername(username: string, type: AccountType, suffix: string) {
        const fullUsername = username + '.' + AccountType.getPreSuffix(type) + suffix;

        return new TonomyUsername(fullUsername);
    }

    static fromFullUsername(username: string): TonomyUsername {
        return new TonomyUsername(username);
    }

    getBaseUsername(): string {
        if (!this.username) throwError('Username is not set', SdkErrors.UsernameNotDefined);
        return this.username?.split('.')[0];
    }

    /**
     * @returns the username hash
     *
     * @throws Error if username is not set
     */
    toString(): string {
        if (!this.username) throwError('Username is not set', SdkErrors.UsernameNotDefined);
        return this.username;
    }

    /**
     * Returns the JSON string representation of the object - which is the username string
     *
     * @description This is used in JSON.stringify(). It is not recommended to use this method directly.
     * Only the username is returned, not the full object. This is all that is needed to reconstruct the
     * full object in the constructor, and thus minimizes the size of the JSON string.
     *
     * @override Serializable.toJSON
     * @returns {string} the username
     * @throws Error if username is not set
     */
    toJSON(): string {
        return this.toString();
    }
}
