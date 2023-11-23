enum UserStatusEnum {
    CREATING_ACCOUNT = 'CREATING_ACCOUNT',
    LOGGING_IN = 'LOGGING_IN',
    READY = 'READY',
    DEACTIVATED = 'DEACTIVATED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace UserStatusEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: UserStatusEnum): number {
        return Object.keys(UserStatusEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): UserStatusEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = UserStatusEnum.indexFor(value as UserStatusEnum);
        } else {
            index = value;
        }

        return Object.values(UserStatusEnum)[index] as UserStatusEnum;
    }
}

export { UserStatusEnum };
