import { AccountType, TonomyUsername } from '../../src/sdk/util/username';
import { getSettings } from '../../src/sdk/util/settings';
import { setTestSettings } from '../../test-integration/helpers/settings';

setTestSettings();

describe('TonomyUsername', () => {
    it('creates a username correctly', () => {
        const username = TonomyUsername.fromUsername('jack', AccountType.PERSON, getSettings().accountSuffix);

        expect(username.username).toEqual('jack.person.test.tonomy.id');
        expect(username.usernameHash).toEqual('1599187240569a41cad6b931b911202926fee043811a42f60807dd9ba18dc399');
    });
    it('gets the base username', () => {
        const username = TonomyUsername.fromUsername('jack', AccountType.PERSON, getSettings().accountSuffix);

        expect(username.getBaseUsername()).toEqual('jack');
    });
});
