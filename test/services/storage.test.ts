import { createStorage } from '../../src/services/storage';
import storageFactory from './jsstorage';

type TestStorage = {
    test: string;
};

describe('Storage', () => {
    it('creates a storage correctly with type', async () => {
        const testStorage = createStorage<TestStorage>('tonomy.test.', storageFactory);
        testStorage.test = 'test';
        await testStorage.test;

        const test = await testStorage.test;
        expect(test).toBe('test');

        const testStorage2 = createStorage<TestStorage>('tonomy.test2.', storageFactory);
        testStorage2.test = 'test2';
        await testStorage2.test;

        const test2 = await testStorage2.test;
        expect(test2).toBe('test2');
        expect(test).toBe('test');
    });

    // This fails typescript compilation as expected
    // it('creates a storage correctly with type', async () => {
    //     const testStorage = createStorage<TestStorage>('tonomy.test.', storageFactory);
    //     testStorage.test2 = 'test';
    //     await testStorage.test2;

    //     const test = await testStorage.test2;
    //     expect(test).toBe('test');
    // });

    it('creates a storage correctly with type', async () => {
        const testStorage = createStorage('tonomy.test.', storageFactory) as any;
        testStorage.test = 'test';
        await testStorage.test;

        const test = await testStorage.test;
        expect(test).toBe('test');
    });
});
