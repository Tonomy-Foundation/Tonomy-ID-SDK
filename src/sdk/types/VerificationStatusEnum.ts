enum VerificationStatusEnum {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DECLINED = 'DECLINED',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VerificationStatusEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: VerificationStatusEnum): number {
        return Object.keys(VerificationStatusEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): VerificationStatusEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = VerificationStatusEnum.indexFor(value.toUpperCase() as VerificationStatusEnum);
        } else {
            index = value;
        }

        const val = Object.values(VerificationStatusEnum)[index] as VerificationStatusEnum;

        if (val === undefined) throw new Error('Invalid VerificationStatusEnum');
        return val;
    }
}

export { VerificationStatusEnum };
