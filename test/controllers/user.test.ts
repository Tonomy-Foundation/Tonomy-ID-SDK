import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { JsKeyManager } from '../../src/sdk/storage/jsKeyManager';
import { User } from '../../src/sdk/controllers/user';
import { setTestSettings } from '../../test-integration/helpers/settings';

setTestSettings();

describe('User class', () => {
    describe('validateUsername()', () => {
        let user: User;

        beforeEach(() => {
            user = new User(new JsKeyManager(), jsStorageFactory);
        });

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
    describe('generateKeywords()', () => {
        let user: User;

        beforeEach(() => {
            user = new User(new JsKeyManager(), jsStorageFactory);
        });

        it('generates random passphrase words', async () => {
            const generatedKeywords = await user.generateRandomPassphrase();

            expect(generatedKeywords).toHaveLength(6);
        });

        it('generates suggested passphrase words', async () => {
            const suggestedWords = await user.suggestPassphraseWord('cap');

            suggestedWords.forEach((word) => {
                expect(word).toContain('cap');
            });
        });
    });
});
