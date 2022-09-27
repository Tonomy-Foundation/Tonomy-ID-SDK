interface PersistantStorage {
  [x: string]: any; // this makes sure that the storage can be accessed with any key

  /**
   * @param key - The key to store the data under
   * @param data - The data to store
   * @throws {Error} If the data could not be stored
   */
  store(key: string, value: any): void;

  /**
   * @param key - The key to retrieve the data from
   * @returns The data stored under the key
   * @throws {Error} If the data could not be retrieved
   */
  retrieve(key: string): any;

  /**
   * clear all the data stored in the storage
   */
  clear(): void;

}

/**
 * A proxy handler that will create magic getters and setters for the storage
 */
const storageProxyHandler: ProxyHandler<PersistantStorage> = {

  /**
   * return the called property from the storage if it exists 
   * @param target - The target object
   * @param propKey - The property key 
   * @returns The value of the property from the storage or cached value
   * @throws {Error} If the data could not be retrieved
   */
  get(target: PersistantStorage, propKey: string) {
    if (propKey in target && propKey !== 'cache') {
      if (propKey === 'clear') {
        target.cache = {};
      }
      return function () {
        target[propKey]();
      }
    }
    if (target.cache[propKey]) return target.cache[propKey];
    try {
      const data = target.retrieve(propKey);
      target.cache[propKey] = data; // cache the data
      return data
    } catch (e) {
      throw new Error(`Could not get ${propKey} from storage - ${e}`);
    }
  },

  /**
   * store the value in the storage
   * @param target - The target object
   * @param propKey - The property key
   * @param value - The value to store
   * @returns true if the value was stored
   * @throws {Error} If the data could not be stored
   */
  set(target: PersistantStorage, p: string, newValue: any) {
    try {
      target.store(p, newValue);
      if (target.cache[p]) delete target.cache[p]; // delete the cached value
    } catch (e) {
      throw new Error(`Could not store data - ${e}`);
    }
    return true;
  },
};


export { PersistantStorage, storageProxyHandler };