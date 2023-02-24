import { setSettings } from '../src';
import { Message } from '../src/util/message';
import settings from './services/settings';
import { createRandomID } from './util/user';

setSettings(settings);

describe('user signing messages', () => {
    test('user can sign a message', async () => {
        const { user } = await createRandomID();
        const payload = {
            id: 123,
            message: 'hi',
        };

        expect(user.signMessage(payload)).resolves.toBeTruthy();

        const message = await user.signMessage(payload);

        expect(message).toBeInstanceOf(Message);
        expect(message.getPayload()).toEqual(payload);
    });

    test('user can verifies created message', async () => {
        expect.assertions(3);
        const { user } = await createRandomID();
        const payload = {
            id: 123444,
            message: 'h2',
        };

        const message = await user.signMessage(payload);

        expect(message).toBeTruthy();
        const verify = await message.verify();

        expect(verify).toBe(true);
        expect(message.getPayload()).toEqual(payload);
    });
});
