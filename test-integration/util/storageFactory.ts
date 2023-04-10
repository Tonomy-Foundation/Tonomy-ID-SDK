import { StorageFactory } from '../../src/sdk';
import { JsStorage } from '../../test/services/jsstorage';

export function createStorageFactory(scope: string): StorageFactory {
    const storage = new JsStorage(scope);

    // @ts-expect-error - scope is declared but never used
    return (scope: string) => storage;
}
