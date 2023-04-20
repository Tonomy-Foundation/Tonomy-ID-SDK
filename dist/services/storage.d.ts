export interface PersistentStorageClean {
    clear: () => Promise<void>;
}
export interface PersistentStorage extends PersistentStorageClean {
    [x: string]: any;
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
export declare const storageProxyHandler: Storage;
export declare type StorageFactory = (scope: string) => PersistentStorage;
export declare function createStorage<T>(scope: string, storageFactory: StorageFactory): T & PersistentStorageClean;
export {};
