import { DataSource } from 'typeorm';
import { IdentityVerificationStorage } from '../../src/sdk/storage/entities/identityVerificationStorage';
import { IdentityVerificationStorageManager } from '../../src/sdk/storage/identityVerificationStorageManager';
import { IdentityVerificationStorageRepository } from '../../src/sdk/storage/identityVerificationStorageRepository';

let dataSource: DataSource;

export const setupTestDatabase = async () => {
    dataSource = new DataSource({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [IdentityVerificationStorage],
        dropSchema: true,
    });

    await dataSource.initialize();
    return dataSource;
};

export const resetTestDatabase = async () => {
    if (dataSource) {
        const identityVerificationStorageRepository = new IdentityVerificationStorageRepository(dataSource);
        const identityVerificationStorageManager = new IdentityVerificationStorageManager(
            identityVerificationStorageRepository
        );

        await identityVerificationStorageManager.deleteAll();
    }
};

export const teardownTestDatabase = async () => {
    if (dataSource) {
        await dataSource.destroy();
    }
};

// Export the data source for use in tests
export { dataSource };
