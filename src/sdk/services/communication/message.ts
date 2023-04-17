import { Issuer } from '@tonomy/did-jwt-vc';
import { DIDurl, JWT, URL } from '../../util/ssi/types';
import { Request } from '../../util/request';

export enum MessageType {
    COMMUNICATION_LOGIN = 'COMMUNICATION_LOGIN',
    IDENTIFY = 'IDENTIFY',
    LOGIN_REQUEST = 'LOGIN_REQUEST',
    LOGIN_REQUEST_RESPONSE = 'LOGIN_REQUEST_RESPONSE',
}

/**
 * A message that can be sent between two Tonomy identities
 */
export class Message<T = object> extends Request<T> {
    /**
     * Creates a signed Message object
     *
     * @param {object} message the message
     * @param {Issuer} issuer the issuer id
     * @param {DIDUrl} recipient the recipient id
     * @param {string} [type] the message type
     *
     * @returns a message object
     */
    static async signMessage<T = object>(
        message: T,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ): Promise<Message<T>> {
        const newOptions = {
            subject: recipient,
            ...options,
        };
        const request = await super.sign(message, issuer, newOptions);

        return new Message<T>(request.getVc());
    }

    /**
     * Returns the recipient of the message
     * @returns {DIDur} the message recipient
     */
    getRecipient(): DIDurl {
        return this.getVc().getSubject() as string;
    }
}
