import { DataSource } from 'typeorm';
import { dbConnection, setupDatabase, veramo, veramo2 } from '../../../src/sdk/util/ssi/veramo';
import { Entities, migrations } from '@veramo/data-store';
import fs from 'fs';

const DATABASE_FILE = '.database.sqlite2.test';

describe('veramo', () => {
    beforeAll(async () => {
        const dataSource = new DataSource({
            type: 'sqlite',
            database: DATABASE_FILE,
            synchronize: false,
            migrations,
            migrationsRun: true,
            logging: ['error', 'info', 'warn'],
            entities: Entities,
        });

        await setupDatabase(dataSource);
    });

    afterEach(async () => {
        const entities = dbConnection.entityMetadatas;

        for (const entity of entities) {
            const repository = dbConnection.getRepository(entity.name);

            await repository.clear(); // This clears all entries from the entity's table.
        }
    });

    afterAll(async () => {
        // delete the database file
        fs.unlinkSync(DATABASE_FILE);
    });

    test('1', async () => {
        await veramo();
    });

    test('2', async () => {
        await veramo2();
    });
});
