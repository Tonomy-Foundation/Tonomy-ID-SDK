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
  var _storage, _keyManager;
  if (!_keyManager) {
    _keyManager = keyManager;
  }
  if (!_storage) {
    storage.cache = {}; // adding cache property to save cache data inside
    _storage = new Proxy(storage, storageProxyHandler);;
  }
  return new User(_keyManager, _storage);
}

export { initialize };