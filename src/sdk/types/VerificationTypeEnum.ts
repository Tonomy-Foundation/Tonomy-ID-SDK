enum VerificationTypeEnum {
    KYC = 'KYC',
    FIRSTNAME = 'FIRSTNAME',
    LASTNAME = 'LASTNAME',
    EMAIL = 'EMAIL',
    PHONE = 'PHONE',
    ADDRESS = 'ADDRESS',
    BIRTHDATE = 'BIRTHDATE',
    NATIONALITY = 'NATIONALITY',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VerificationTypeEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: VerificationTypeEnum): number {
        return Object.keys(VerificationTypeEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): VerificationTypeEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = VerificationTypeEnum.indexFor(value as VerificationTypeEnum);
        } else {
            index = value;
        }

        return Object.values(VerificationTypeEnum)[index] as VerificationTypeEnum;
    }
}

export { VerificationTypeEnum };
