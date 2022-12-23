import { throwError } from './errors';

// TODO make into abstract class which constructs with cache and scope
export interface PersistentStorage {
    [x: string]: any; // this makes sure that the storage can be accessed with any key
    scope: string;

    /**
     * @param key - The key to store the data under
     * @param data - The data to store
     * @throws {Error} If the data could not be stored
     */
    store(key: string, value: any): Promise<void>;

    /**
     * @param key - The key to retrieve the data from
     * @returns The data stored under the key
     * @throws {Error} If the data could not be retrieved
     */
    // TODO change to get()?
    retrieve(key: string): Promise<any>;

    // TODO remove item function
    // remove(key: string): Promise<void>;

    /**
     * clear all the data stored in the storage
     */
    clear(): Promise<void>;
}

interface Storage extends Omit<ProxyHandler<PersistentStorage>, 'set'> {
    set(target: PersistentStorage, key: string, value: any): Promise<boolean>;
}

/**
 * A proxy handler that will create magic getters and setters for the storage
 */
export const storageProxyHandler: Storage = {
    /**
     * return the called property from the storage if it exists
     * @param target - The target object
     * @param key - The property key
     * @returns The value of the property from the storage or cached value
     * @throws {Error} If the data could not be retrieved
     */
    get: (target: PersistentStorage, key: string) => {
        if (key === 'scope') throwError('Scope is a reserved key');
        if (key === 'cache') throwError('Cache is a reserved key');

        const scopedKey = target.scope + key;

        if (key in target) {
            if (key === 'clear') {
                target.cache = {};
            }
            return function () {
                target[scopedKey]();
            };
        }
        if (target.cache[scopedKey]) return target.cache[scopedKey];

        return target
            .retrieve(scopedKey)
            .then((data) => {
                target.cache[scopedKey] = data; // cache the data
                return data;
            })
            .catch((e) => {
                throwError(`Could not get ${scopedKey} from storage - ${e}`);
            });
    },

    /**
     * store the value in the storage
     * @param target - The target object
     * @param key - The property key
     * @param value - The value to store
     * @returns true if the value was stored
     * @throws {Error} If the data could not be stored
     */
    set: async function (target: PersistentStorage, key: string, value: any) {
        const scopedKey = target.scope + key;

        return target
            .store(scopedKey, value)
            .then(() => {
                target.cache[scopedKey] = value;
                return true;
            })
            .catch(() => {
                return false;
                // throw new Error(`Could not store data - ${e}`);
            });
    },
};

export type StorageFactory = (scope: string) => PersistentStorage;

export function createStorage<T>(scope: string, storageFactory: StorageFactory): T {
    const storage = storageFactory(scope);
    storage.cache = {};
    const proxy = new Proxy(storage, storageProxyHandler as any) as any;

    return proxy as T;
}
