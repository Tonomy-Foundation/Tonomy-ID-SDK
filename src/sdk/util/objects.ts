export function copyObject(object: object): object {
    return JSON.parse(JSON.stringify(object));
}

export interface MapObject {
    [key: string]: any;
}
