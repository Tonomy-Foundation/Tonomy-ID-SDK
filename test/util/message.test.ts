import { PrivateKey } from '@greymass/eosio';
import { createSigner } from '@tonomy/antelope-ssi-toolkit';
import { Message } from '../../src/util/message';

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
                signer: createSigner(PrivateKey.from('5K64AHK3SbXjzmeWeG1Mx98uNFnQRpGYZJJz6fMjho7RytrEAAy')),
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

    // it('verifies the jwt', () => {
    //     expect(message.verify()).toBeTruthy();
    // });
});

describe('message signed with did:jwt', () => {
    const message = new Message(
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9.eyJpYXQiOjE2NzY3MzE3MTUsInJhbmRvbVN0cmluZyI6IjFlMWU0MGI1NTk3MGU5NzE0MWRiYmQ3N2ZhNjFlMjllM2JlYTA0NGQyODcwNDM0ODNmZDU1MmE3Yjk4N2M5MjAiLCJvcmlnaW4iOiJodHRwczovL3Rvbm9teS1pZC1tYXJrZXQtY29tLXN0YWdpbmcudG9ub215LmZvdW5kYXRpb24iLCJwdWJsaWNLZXkiOiJQVUJfSzFfNk5Ba3hjMVRSSm5Ta2h6QkZ2RzJMeXdxUmNTMnNiR2FYamNCSHRqQkxzNkhMamlBZ1giLCJjYWxsYmFja1BhdGgiOiIvY2FsbGJhY2siLCJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKelpXTndNalUyYXpFaUxDSnJkSGtpT2lKRlF5SXNJbmdpT2lKM2IzVndaRFlyYWtVeFUwY3ZkRlZITTI5UE1WZFpSekpaVEV0MFNrcEdOVGRyUm1GbWNGaFZlbUZKUFNJc0lua2lPaUowY204emFrSnpjMDVUWTFocFVtcGhXRVowYzFOTGRGZFlSSFJ5UVVoaVZFNUpUM0JGU25oc0syOVpQU0lzSW10cFpDSTZJbEJWUWw5TE1WODJUa0ZyZUdNeFZGSktibE5yYUhwQ1JuWkhNa3g1ZDNGU1kxTXljMkpIWVZocVkwSklkR3BDVEhNMlNFeHFhVUZuV0NKOSJ9.Wn8K8ZrtU2oGTtK1vMFPkvSgO1I_h3nTFeiRl6wyXq1xfNNY3Q0jKrshyGht5W9xHGWPHgr-KmHG3gsrVUA_2AE'
    );

    it('verified the jwt', () => {
        expect(message.verify()).resolves.toBeTruthy();
    });
});
