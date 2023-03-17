import { PersistentStorage } from '../../src/services/storage';

export class JsStorage implements PersistentStorage {
    private _storage: {
        [key in string]: any;
    } = {} as any;
    scope: string;

    constructor(scope: string) {
        this.scope = scope;
        this._storage = {};
    }

    async retrieve(key: string): Promise<any> {
        if (this.scope + key in this._storage) return this._storage[this.scope + key];

        if (localStorage) {
            const value = localStorage.getItem(this.scope + key);

            if (value) {
                this._storage[this.scope + key] = JSON.parse(value);
                return value;
            }
        } else {
            return null;
        }
    }

    async store(key: string, value: any): Promise<void> {
        if (localStorage) {
            localStorage.setItem(this.scope + key, JSON.stringify(value));
        }

        this._storage[this.scope + key] = value;
    }

    async clear(): Promise<void> {
        this._storage = {};

        if (localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                if (typeof key === 'string' && key.startsWith(this.scope)) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
}

export function jsStorageFactory(scope: string): PersistentStorage {
    return new JsStorage(scope);
}
