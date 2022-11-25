import { KeyManager } from './keymanager';
import { SettingsType, setSettings } from './settings';
import { PersistantStorage, storageProxyHandler } from './storage';
import { User } from './user';

/**
 * initliaze the sdk and return the user object
 * @param keyManager  the key manager
 * @param storage  the storage
 * @returns the user object
 */
function initialize(keyManager: KeyManager, storage: PersistantStorage, settings: SettingsType): User {
    setSettings(settings);

    storage.cache = {}; // adding cache property to save cache data inside
    const _storage = new Proxy(storage, storageProxyHandler as any); // used any to avoid typed error
    return new User(keyManager, _storage);
}

export { initialize };
