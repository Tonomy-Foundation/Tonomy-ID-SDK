import { Message } from './message';
import { DIDurl, URL } from '../../util/ssi/types';
import { Issuer } from 'did-jwt-vc';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:VerificationMessage');

export interface VerificationMessagePayload {
    veriffId: string;
    vc: string;
    type: string;
}

export class VerificationMessage extends Message<VerificationMessagePayload> {
    protected static type = 'verification.message';
    public type: string;
    public payload: VerificationMessagePayload;

    constructor(vc: Message<VerificationMessagePayload>) {
        super(vc);
        this.type = VerificationMessage.type;
        this.payload = this.getVc().getPayload().vc.credentialSubject.payload as VerificationMessagePayload;
        debug('VerificationMessage payload', this.payload);
    }

    /**
     * Alternative constructor that returns type VerificationMessage
     */
    static async signMessage(
        message: VerificationMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ): Promise<VerificationMessage> {
        const vc = await Message.signMessageWithRecipient(message, issuer, recipient, options);
        const verificationMessage = new VerificationMessage(vc);

        return verificationMessage;
    }
}
