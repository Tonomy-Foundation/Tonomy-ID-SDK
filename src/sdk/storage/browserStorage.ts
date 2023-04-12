import { PersistentStorage } from './storage';

export class BrowserStorage implements PersistentStorage {
    private _storage: {
        [key in string]: any;
    } = {} as any;
    scope: string;

    constructor(scope: string) {
        this.scope = scope;
        this._storage = {};
    }

    async retrieve(key: string): Promise<any> {
        if (key in this._storage) return this._storage[key];

        if (localStorage) {
            const value = localStorage.getItem(key);

            if (value) {
                const returnValue = JSON.parse(value);

                this._storage[key] = returnValue;
                return returnValue;
            }
        } else {
            return undefined;
        }
    }

    async store(key: string, value: any): Promise<void> {
        if (localStorage) {
            localStorage.setItem(key, JSON.stringify(value));
        }

        this._storage[key] = value;
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

export function browserStorageFactory(scope: string): PersistentStorage {
    return new BrowserStorage(scope);
}
