export function copyObject<T>(object: T): T {
    return JSON.parse(JSON.stringify(object));
}

export type KeyValueObject = Record<string, string>;
