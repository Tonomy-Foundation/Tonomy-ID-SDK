import { setSettings } from '../../src/sdk';
import { IdentifyMessage, Message } from '../../src/sdk/services/communication/message';
import settings from '../helpers/settings';
import { createRandomID } from '../helpers/user';

setSettings(settings);

describe('user signing messages', () => {
    test('user can sign a message', async () => {
        expect.assertions(3);
        const { user } = await createRandomID();
        const issuer = await user.getIssuer();
        const message = await IdentifyMessage.signMessage({}, issuer, 'did:antelope:tonomy:test:1234');

        expect(message).toBeInstanceOf(Message);
        expect(message.getType()).toBe(IdentifyMessage.getType());
        expect(message.getPayload()).toEqual({});
        user.logout();
    });

    test('user can verifies created message', async () => {
        expect.assertions(3);
        const { user } = await createRandomID();
        const issuer = await user.getIssuer();
        const message = await IdentifyMessage.signMessage({}, issuer, 'did:antelope:tonomy:test:1234');

        expect(message).toBeTruthy();
        const verify = await message.verify();

        expect(verify).toBe(true);
        expect(message.getPayload()).toEqual({});
        user.logout();
    });
});
