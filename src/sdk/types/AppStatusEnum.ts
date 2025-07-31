enum AppStatusEnum {
    PENDING = 'PENDING',
    CREATING = 'CREATING',
    READY = 'READY',
    DEACTIVATED = 'DEACTIVATED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace AppStatusEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: AppStatusEnum): number {
        return Object.keys(AppStatusEnum).indexOf(value);
    }

    /*
     * Creates an AppStatusEnum from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): AppStatusEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = AppStatusEnum.indexFor(value.toUpperCase() as AppStatusEnum);
        } else {
            index = value;
        }

        const val = Object.values(AppStatusEnum)[index] as AppStatusEnum;

        if (val === undefined) throw new Error('Invalid AppStatusEnum');
        return val;
    }
}

export { AppStatusEnum };
