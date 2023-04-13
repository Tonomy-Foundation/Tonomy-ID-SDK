import { createStorage, STORAGE_NAMESPACE } from '../../src/sdk/storage/storage';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';

type TestStorage = {
    test: string;
};

describe('Storage', () => {
    it('creates a storage correctly with type', async () => {
        const testStorage = createStorage<TestStorage>(STORAGE_NAMESPACE + 'test.', jsStorageFactory);

        testStorage.test = 'test';
        await testStorage.test;

        const test = await testStorage.test;

        expect(test).toBe('test');

        const testStorage2 = createStorage<TestStorage>(STORAGE_NAMESPACE + 'test2.', jsStorageFactory);

        testStorage2.test = 'test2';
        await testStorage2.test;

        const test2 = await testStorage2.test;

        expect(test2).toBe('test2');
        expect(test).toBe('test');
    });

    // This fails typescript compilation as expected
    // it('creates a storage correctly with type', async () => {
    //     const testStorage = createStorage<TestStorage>(STORAGE_NAMESPACE + 'test.', storageFactory);
    //     testStorage.test2 = 'test';
    //     await testStorage.test2;

    //     const test = await testStorage.test2;
    //     expect(test).toBe('test');
    // });

    it('creates a storage correctly with type', async () => {
        const testStorage = createStorage(STORAGE_NAMESPACE + 'test.', jsStorageFactory) as any;

        testStorage.test = 'test';
        await testStorage.test;

        const test = await testStorage.test;

        expect(test).toBe('test');
    });
});
