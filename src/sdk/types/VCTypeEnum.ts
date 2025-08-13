enum VCTypeEnum {
    VERIFFv1 = 'VERIFFv1',
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VCTypeEnum {
    /*
     * Returns the index of the enum value
     *
     * @param value The level to get the index of
     */
    export function indexFor(value: VCTypeEnum): number {
        return Object.keys(VCTypeEnum).indexOf(value);
    }

    /*
     * Creates an AuthenticatorLevel from a string or index of the level
     *
     * @param value The string or index
     */
    export function from(value: number | string): VCTypeEnum {
        let index: number;

        if (typeof value !== 'number') {
            index = VCTypeEnum.indexFor(value.toUpperCase() as VCTypeEnum);
        } else {
            index = value;
        }

        const val = Object.values(VCTypeEnum)[index] as VCTypeEnum;

        if (val === undefined) throw new Error('Invalid VCTypeEnum');
        return val;
    }
}

export { VCTypeEnum };
