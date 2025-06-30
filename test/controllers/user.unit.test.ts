import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { JsKeyManager } from '../../src/sdk/storage/jsKeyManager';
import { User } from '../../src/sdk/controllers/User';
import { DataSource } from 'typeorm';
import { setupDatabase } from '../../test/setup';

describe('User class', () => {
    let user: User;
    let dataSource: DataSource;

    beforeEach(async () => {
        dataSource = await setupDatabase();
        user = new User(new JsKeyManager(), jsStorageFactory, dataSource);
    });
    describe('validateUsername()', () => {
        it('validates a correct username', async () => {
            expect(() => user['validateUsername']('test')).not.toThrowError();
            expect(() => user['validateUsername']('test1234')).not.toThrowError();
            expect(() => user['validateUsername']('testTEST')).not.toThrowError();
            expect(() => user['validateUsername']('test-_')).not.toThrowError();
            expect(() => user['validateUsername']('testTEST1234-_')).not.toThrowError();
        });

        it('fails validates an incorrect username', async () => {
            expect(() => user['validateUsername']('')).toThrowError();
            expect(() => user['validateUsername']('abc.')).toThrowError();
            expect(() => user['validateUsername']('abc!')).toThrowError();
            expect(() =>
                user['validateUsername'](
                    '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789'
                )
            ).toThrowError();
        });
    });
});
