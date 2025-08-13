enum ProviderEnum {
    VERIFF = 'VERIFF',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ProviderEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: ProviderEnum): number {
        return Object.keys(ProviderEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): ProviderEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = ProviderEnum.indexFor(value.toUpperCase() as ProviderEnum);
        } else {
            index = value;
        }

        const val = Object.values(ProviderEnum)[index] as ProviderEnum;

        if (val === undefined) throw new Error('Invalid ProviderEnum');
        return val;
    }
}

export { ProviderEnum };
