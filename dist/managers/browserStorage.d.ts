import { PersistentStorage } from '../services/storage';
export declare class BrowserStorage implements PersistentStorage {
    private _storage;
    scope: string;
    constructor(scope: string);
    retrieve(key: string): Promise<any>;
    store(key: string, value: any): Promise<void>;
    clear(): Promise<void>;
}
export declare function browserStorageFactory(scope: string): PersistentStorage;
