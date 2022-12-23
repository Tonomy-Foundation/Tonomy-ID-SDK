import { PersistentStorage } from '../../src/services/storage';

export class JsStorage implements PersistentStorage {
    private _storage: any;
    scope: string;

    constructor(scope: string) {
        this.scope = scope;
        this._storage = {};
    }

    async retrieve(key: string): Promise<any> {
        return this._storage[key];
    }

    async store(key: string, value: any): Promise<void> {
        this._storage[key] = value;
    }

    async clear(): Promise<void> {
        this._storage = {};
    }
}

export default function jsStorageFactory(scope: string): PersistentStorage {
    return new JsStorage(scope);
}
