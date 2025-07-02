export function copyObject(object: object): object {
    return JSON.parse(JSON.stringify(object));
}

export type KeyValueObject = Record<string, string>;
