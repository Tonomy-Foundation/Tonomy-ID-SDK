import { KeyManager } from "./keymanager";
import { PersistantStorage } from "./storage";
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
    _storage = storage;
  }
  return new User(_keyManager, _storage);
}

export { initialize };