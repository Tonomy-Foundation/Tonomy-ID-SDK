import { PersistentStorage } from '../../src/services/storage';
export declare class JsStorage implements PersistentStorage {
    private _storage;
    scope: string;
    constructor(scope: string);
    retrieve(key: string): Promise<any>;
    store(key: string, value: any): Promise<void>;
    clear(): Promise<void>;
}
export declare function jsStorageFactory(scope: string): PersistentStorage;
