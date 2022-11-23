import { AccountType, TonomyUsername } from '../src/username';

describe('TonomyUsername', () => {
    it('creates a username correctly', () => {
        const username = new TonomyUsername('jack', AccountType.PERSON, '.test.id');
        expect(username.username).toEqual('jack.person.test.id');
        expect(username.usernameHash).toEqual('15a3088c94387be95c5c7528e8557c6f837b7a44b8dbe8c640a79073cf45b230');
    });
});
