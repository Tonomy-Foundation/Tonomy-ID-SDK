import { AccountType, TonomyUsername } from '../../src/sdk/util/username';
import { getSettings } from '../../src/sdk/util/settings';
import { setTestSettings, settings } from '../../test-integration/helpers/settings';

setTestSettings();

describe('TonomyUsername', () => {
    it('creates a username correctly', () => {
        const username = TonomyUsername.fromUsername('jack', AccountType.PERSON, getSettings().accountSuffix);

        expect(username.username).toEqual('jack.person' + getSettings().accountSuffix);
        expect(username.usernameHash).toEqual('7ee073679cb687f92f6aa055eef9e82b96f069417a83a485708859377c48989e');
    });
    it('gets the base username', () => {
        const username = TonomyUsername.fromUsername('jack', AccountType.PERSON, getSettings().accountSuffix);

        expect(username.getBaseUsername()).toEqual('jack');
    });
});
