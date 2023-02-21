import { setSettings } from '../src';
import { Message } from '../src/util/message';
import settings from './services/settings';
import { catchAndPrintErrors } from './util/errors';
import { createRandomID } from './util/user';

setSettings(settings);

describe('user signing messages', () => {
    test(
        'user can sign a message',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();
            const payload = {
                id: 123,
                message: 'hi',
            };

            expect(user.signMessage(payload)).resolves.toBeTruthy();

            const message = await user.signMessage(payload);

            expect(message).toBeInstanceOf(Message);
            expect(message.getPayload()).toEqual(payload);
        })
    );

    test(
        'user can verifies created message',
        catchAndPrintErrors(async () => {
            const { user } = await createRandomID();
            const payload = {
                id: 123444,
                message: 'h2',
            };

            const message = await user.signMessage(payload);

            await console.log(message.jwt);
            expect(message.verify()).resolves.toBe(true);
            expect(message.getPayload()).toEqual(payload);
        })
    );
});
