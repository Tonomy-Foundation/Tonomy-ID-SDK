enum VeriffStatusEnum {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DECLINED = 'DECLINED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VeriffStatusEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: VeriffStatusEnum): number {
        return Object.keys(VeriffStatusEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): VeriffStatusEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = VeriffStatusEnum.indexFor(value as VeriffStatusEnum);
        } else {
            index = value;
        }

        return Object.values(VeriffStatusEnum)[index] as VeriffStatusEnum;
    }
}

export { VeriffStatusEnum };
