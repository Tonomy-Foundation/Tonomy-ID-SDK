import { Issuer } from '@tonomy/did-jwt-vc';
import { DIDurl, JWT, URL } from '../../util/ssi/types';
import { VerifiableCredential, VerifiableCredentialWithType } from '../../util/ssi/vc';
import { LoginRequest } from '../../util/request';
import { TonomyUsername } from '../../util/username';
import { Name } from '@greymass/eosio';

// export enum MessageType {
//     COMMUNICATION_LOGIN = 'COMMUNICATION_LOGIN',
//     IDENTIFY = 'IDENTIFY',
//     LOGIN_REQUEST = 'LOGIN_REQUEST',
//     LOGIN_REQUEST_RESPONSE = 'LOGIN_REQUEST_RESPONSE',
// }

/**
 * A message that can be sent between two Tonomy identities
 */
export class Message<T = object> extends VerifiableCredentialWithType<T> {
    static async sign<T = object>(
        request: T,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<VerifiableCredentialWithType<T>> {
        throw new Error('Use Message.signMessage instead');
    }

    /**
     * Creates a signed Message object
     *
     * @param {object} message the message
     * @param {Issuer} issuer the issuer id
     * @param {DIDUrl} recipient the recipient id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a message object
     */
    static async signMessage<T = object>(
        message: T,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ): Promise<Message<T>> {
        const payloadType = this.name;

        if (payloadType === Message.name || payloadType === 'Message') {
            throw new Error('class should be a derived class of Message to use the type property');
        }

        const newOptions = {
            subject: recipient,
            additionalTypes: ['TonomyMessage'],
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

    /**
     * Returns the sender of the message
     * @returns {DIDur} the message sender
     */
    getSender(): DIDurl {
        return super.getIssuer();
    }
}

// empty object
export type IdentifyMessagePayload = Record<string, never>;
export class IdentifyMessage extends Message<IdentifyMessagePayload> { }

export type LoginRequestMessagePayload = {
    requests: LoginRequest[];
};
export class LoginRequestMessage extends Message<LoginRequestMessagePayload> { }

export type LoginRequestResponseMessagePayload = {
    success: boolean;
    requests?: LoginRequest[];
    accountName: Name;
    username: TonomyUsername;
    failReason?: string;
};
export class LoginRequestResponseMessage extends Message<LoginRequestResponseMessagePayload> { }
