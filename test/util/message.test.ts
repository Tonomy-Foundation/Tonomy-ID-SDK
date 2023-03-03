import { PrivateKey } from '@greymass/eosio';
import { createSigner } from '@tonomy/antelope-ssi-toolkit';
import { createVCSigner, generateRandomKeyPair, KeyManagerLevel, setSettings } from '../../src';
import { Message } from '../../src/util/message';
import { JsKeyManager } from '../services/jskeymanager';

setSettings({
    blockchainUrl: 'localhost:8888',
});

describe('check if message class has correct functions', () => {
    const message = new Message(
        `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6dGVsb3M6dW5pdmVyc2l0eSNwZXJtaXNzaW9uMCIsImp0aSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3NjcxNDQ2OSwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiZGVncmVlIjp7Im5hbWUiOiJCYWNjYWxhdXLDqWF0IGVuIG11c2lxdWVzIG51bcOpcmlxdWVzIiwidHlwZSI6IkJhY2hlbG9yRGVncmVlIn19LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.oc9xx_owlXz8L_fhjXo-mNhWNWl7YoMAr50HAJ5-On2p_RgoJ-E8SWDrHkITQnr9ysSKa1pF7gUWbFdiLSuL3AA`
    );

    it('class is defined', () => {
        expect(Message).toBeTruthy();
    });

    it('has sign function', () => {
        expect(Message).toHaveProperty('sign');
    });
    it('has getSender function', () => {
        expect(message).toHaveProperty('getSender');
    });
    it('has getRecipient function', () => {
        expect(message).toHaveProperty('getRecipient');
    });
    it('has getPayload function', () => {
        expect(message).toHaveProperty('getPayload');
    });
    // it('has getType function', () => {
    //     expect(message).toHaveProperty('getType');
    // });
    it('has verify function', () => {
        expect(message).toHaveProperty('verify');
    });
});

describe('message signed with testnetjungle key', () => {
    let message: Message;

    beforeAll(async () => {
        message = await Message.sign(
            { item: { id: 1, name: 'testname' } },
            {
                did: 'did:antelope:eos:testnet:jungle:reball1block#permission0',
                signer: createSigner(PrivateKey.from('5K64AHK3SbXjzmeWeG1Mx98uNFnQRpGYZJJz6fMjho7RytrEAAy') as any),
                alg: 'ES256K-R',
            },
            'did:antelope:eos:testnet:jungle:reball1block#permission1'
        );
    });

    it('message has right type', () => {
        expect(message).toBeInstanceOf(Message);
    });

    it('gets right sender', () => {
        expect(message.getSender()).toBe('did:antelope:eos:testnet:jungle:reball1block#permission0');
    });

    it('gets right recipient', () => {
        expect(message.getRecipient()).toBe('did:antelope:eos:testnet:jungle:reball1block#permission1');
    });

    it('gets right payload', () => {
        expect(message.getPayload()).toEqual({ item: { id: 1, name: 'testname' } });
    });
});

describe('message signed with did:jwk', () => {
    const message = new Message(
        'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lJeWFFTkZZbmhoWTFFdldXSmhjRmt5VlRVMlkySXJSME13ZDJwamNVMWtia1JvYzJ0R1ZuRjZiVW8wUFNJc0lua2lPaUpZVVN0SFZtTk9ZVGR5UkhWbVRXWkhVbmszTkRkc1MxZFBaWHBHTUVabWRtaHdVVUZ5ZFRkM1VuUkZQU0lzSW10cFpDSTZJbEJWUWw5TE1WODRWa2RvU2pnemIzQmhTMmw2TkZWaVpGYzRhMmcyZEVkQmJXcHhVM0pSVmtaUWRtNWFlRmRFZWpONGRVaG1iVEpwUkNKOSIsImp0aSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vaWQvMTIzNDMyNCIsIm5iZiI6MTY3NjkwMDAzMSwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsibWVzc2FnZSI6eyJjYWxsYmFja1BhdGgiOiIvY2FsbGJhY2siLCJvcmlnaW4iOiJodHRwOi8vMTkyLjE2OC42OC4xMTI6MzAwMSIsInB1YmxpY0tleSI6IlBVQl9LMV84VkdoSjgzb3BhS2l6NFViZFc4a2g2dEdBbWpxU3JRVkZQdm5aeFdEejN4dUhmbTJpRCIsInJhbmRvbVN0cmluZyI6IjY3YzFiNzg0YmM2NWUwZjQxMTllOWQ5Zjk4NzQ4MjJiNmIxOWQ2OTNlN2MzYWJmMjRiZTFjMTFjNWM1ZWU4YjAifX0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXX19.XNGfvbEx0m6_37zZY9fsghDwUIFq4Fszksi5FY2XfpfC3WvNkPn0uhFm6h8KDKl3QdhC8Kf1hf16jt5ntt8m8QA'
    );

    it('verified the jwt', () => {
        expect(message.verify()).resolves.toBeTruthy();
    });
});

describe('keymanagersigner is correct', () => {
    it('has same signer as antelopessi toolkit', async () => {
        const data = 'hi12asdasdasdsd3';

        const { privateKey } = generateRandomKeyPair();
        const keymanager = new JsKeyManager();

        keymanager.storeKey({ level: KeyManagerLevel.LOCAL, privateKey: privateKey });
        const signer = createVCSigner(keymanager, KeyManagerLevel.LOCAL).sign;
        const antelopeSigner = createSigner(privateKey as any);

        const signedWithTonomy = await signer(data);

        const signedWithAntelopeToolKit = await antelopeSigner(data);

        expect(signedWithTonomy).toBeTruthy();
        expect(signedWithAntelopeToolKit).toBeTruthy();
        expect(signedWithTonomy).toEqual(signedWithAntelopeToolKit);
    });
});
