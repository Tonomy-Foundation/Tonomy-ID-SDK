import { Issuer } from '@tonomy/did-jwt-vc';
import { VerifiableCredential } from '../../util/ssi/vc';
import { DIDurl, JWT } from '../../util/ssi/types';
import { randomString } from '../../util/crypto';

export enum MessageType {
    COMMUNICATION_LOGIN = 'COMMUNICATION_LOGIN',
    IDENTIFY = 'IDENTIFY',
    LOGIN_REQUEST = 'LOGIN_REQUEST',
    LOGIN_REQUEST_RESPONSE = 'LOGIN_REQUEST_RESPONSE',
}

/**
 * A message that can be sent between two Tonomy identities
 */
export class Message<T = object> {
    vc: VerifiableCredential<{ message: T; type?: string }>;

    constructor(vc: VerifiableCredential<{ message: T; type?: string }> | JWT) {
        if (typeof vc === 'string') {
            this.vc = new VerifiableCredential<{ message: T; type?: string }>(vc);
        } else {
            this.vc = vc;
        }
    }

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
    static async sign<T = object>(message: T, issuer: Issuer, recipient: string, type?: string): Promise<Message<T>> {
        const credentialSubject = Object.assign({ message }, { type });

        const id = 'https://tonomy.foundation/message/id/' + randomString(10);

        const vc = await VerifiableCredential.sign<{ message: T; type?: string }>(
            id,
            ['VerifiableCredential', 'TonomyMessage'],
            credentialSubject,
            issuer,
            recipient
        );

        return new Message<T>(vc);
    }

    /**
     * Returns the internal Verifiable Credential
     * @returns {VerifiableCredential} the VC
     */
    getVc(): VerifiableCredential<{ message: T; type?: string }> {
        return this.vc;
    }

    /**
     * Returns the sender of the message
     * @returns {DIDurl} the message sender
     */
    getSender(): DIDurl {
        return this.getVc().getIssuer();
    }

    /**
     * Returns the recipient of the message
     * @returns {DIDur} the message recipient
     */
    getRecipient(): DIDurl {
        return this.getVc().getSubject() as string;
    }

    /**
     * Returns the message payload
     * @returns {object} the message
     */
    getPayload(): T {
        return this.getVc().getCredentialSubject().message;
    }

    /**
     * Returns the message type used to determine what kind of message it is
     * @returns {string | undefined} the message type
     */
    getType(): string | undefined {
        return this.getVc().getCredentialSubject().type;
    }

    /**
     * Verifies that the message is signed by the sender
     *
     * @returns {Promise<boolean>} true if the message is signed by the sender
     * @throws {Error} if the message is not signed by the sender
     */
    async verify(): Promise<boolean> {
        return (await this.getVc().verify()).verified;
    }

    /**
     * Returns the JWT string
     *
     * @returns {string} the JWT string
     */
    toString(): string {
        return this.getVc().toString();
    }
}
