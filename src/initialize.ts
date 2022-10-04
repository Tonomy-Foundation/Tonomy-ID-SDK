import { KeyManager } from "./keymanager";
import { PersistantStorage, storageProxyHandler } from "./storage";
import { User } from "./user";


/**
 * initliaze the sdk and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
function initialize(keyManager: KeyManager, storage: PersistantStorage): User {
  storage.cache = {}; // adding cache property to save cache data inside
  const _storage = new Proxy(storage, storageProxyHandler as any); // used any to avoid typed error
  return new User(keyManager, _storage);
}

export { initialize };