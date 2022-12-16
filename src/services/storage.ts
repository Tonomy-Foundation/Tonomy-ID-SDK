interface PersistentStorage {
    [x: string]: any; // this makes sure that the storage can be accessed with any key

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
    retrieve(key: string): Promise<any>;

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
const storageProxyHandler: Storage = {
    /**
     * return the called property from the storage if it exists
     * @param target - The target object
     * @param propKey - The property key
     * @returns The value of the property from the storage or cached value
     * @throws {Error} If the data could not be retrieved
     */
    get: (target: PersistentStorage, propKey: string) => {
        if (propKey in target && propKey !== 'cache') {
            if (propKey === 'clear') {
                target.cache = {};
            }
            return function () {
                target[propKey]();
            };
        }
        if (target.cache[propKey]) return target.cache[propKey];

        return target
            .retrieve(propKey)
            .then((data) => {
                target.cache[propKey] = data; // cache the data
                return data;
            })
            .catch((e) => {
                throw new Error(`Could not get ${propKey} from storage - ${e}`);
            });
    },

    /**
     * store the value in the storage
     * @param target - The target object
     * @param propKey - The property key
     * @param value - The value to store
     * @returns true if the value was stored
     * @throws {Error} If the data could not be stored
     */
    set: async function (target: PersistentStorage, p: string, newValue: any) {
        return target
            .store(p, newValue)
            .then(() => {
                target.cache[p] = newValue;
                return true;
            })
            .catch(() => {
                return false;
                // throw new Error(`Could not store data - ${e}`);
            });
    },
};

export { PersistentStorage, storageProxyHandler };
