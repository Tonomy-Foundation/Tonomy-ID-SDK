import { PrivateKey } from '@wharfkit/antelope';
import { generateRandomKeyPair, createSigner } from '../../../src/sdk';
import { IdentifyMessage } from '../../../src/sdk/services/communication/message';
import { Issuer } from 'did-jwt-vc';
import { toDidKeyIssuer } from '../../../src/sdk/util/ssi/did-key';

describe('Message class', () => {
    let issuer: Issuer;
    const recipient = 'did:antelope:tonomy:staging:test#permission1';

    beforeEach(async () => {
        const { privateKey } = generateRandomKeyPair();

        issuer = await toDidKeyIssuer(privateKey);
    });

    it('creates a IdentifyMessage with the correct functions', async () => {
        const identifyMessage = await IdentifyMessage.signMessage({}, issuer, recipient);

        expect(identifyMessage).toBeDefined();
        expect(identifyMessage.getVc).toBeDefined();
        expect(identifyMessage.getSender).toBeDefined();
        expect(identifyMessage.getPayload).toBeDefined();
        expect(identifyMessage.getType).toBeDefined();
        expect(identifyMessage.verify).toBeDefined();
        expect(identifyMessage.toString).toBeDefined();
        expect(identifyMessage.getSender).toBeDefined();
    });

    it('creates a IdentifyMessage with a did-key', async () => {
        const identifyMessage = await IdentifyMessage.signMessage({}, issuer, recipient);

        expect(identifyMessage.getSender()).toBe(issuer.did);
        expect(identifyMessage.getPayload()).toStrictEqual({});
        expect(identifyMessage.getType()).toBe('IdentifyMessage');

        expect(await identifyMessage.verify()).toBe(true);
        expect(identifyMessage.toString().length).toBeGreaterThan(10);
    });

    it('creates a IdentifyMessage with a did-key with the correct types', async () => {
        const identifyMessage = await IdentifyMessage.signMessage({}, issuer, recipient);

        expect(identifyMessage.getType()).toBe('IdentifyMessage');
        expect(identifyMessage.getVc().getVc().type).toStrictEqual([
            'VerifiableCredential',
            'TonomyVerifiableCredentialWithType',
            'TonomyMessage',
        ]);
    });

    describe('message signed with testnetjungle key', () => {
        let message: IdentifyMessage;
        const recipient = 'did:antelope:tonomy:staging:test#permission1';

        beforeAll(async () => {
            message = await IdentifyMessage.signMessage(
                {},
                {
                    did: 'did:antelope:eos:testnet:jungle:reball1block#permission0',
                    signer: createSigner(PrivateKey.from('5K64AHK3SbXjzmeWeG1Mx98uNFnQRpGYZJJz6fMjho7RytrEAAy') as any),
                    alg: 'ES256K-R',
                },
                recipient
            );
        });

        it('gets right sender', () => {
            expect(message.getSender()).toBe('did:antelope:eos:testnet:jungle:reball1block#permission0');
        });

        it('gets right recipient', () => {
            expect(message.getRecipient()).toBe(recipient);
        });

        it('gets right payload', () => {
            expect(message.getPayload()).toStrictEqual({});
        });
    });
});
