import { DataSource } from 'typeorm';
import { IdentityVerificationStorage } from './sdk/storage/entities/identityVerificationStorage';

let dataSource: DataSource;

export const setupDatabase = async () => {
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

export const teardownTestDatabase = async () => {
    if (dataSource) {
        await dataSource.destroy();
    }
};

// Export the data source for use in tests
export { dataSource };
