import { Issuer } from '@tonomy/did-jwt-vc';
import { DIDurl, URL } from '../../util/ssi/types';
import { VerifiableCredentialWithType, VCWithTypeType } from '../../util/ssi/vc';
import { LoginRequest } from '../../util/request';
import { TonomyUsername } from '../../util/username';
import { Name } from '@greymass/eosio';
import { SdkErrors } from '../../util/errors';

/**
 * A message that can be sent between two Tonomy identities
 *
 * @inheritdoc Constructor should be overridden if the payload type requires ad-hoc decoding
 * @inheritdoc A new static function signMessage() should be added to child classes
 * as an alternative constructor to sign a message object and return the class type
 */
export class Message<T extends object = object> extends VerifiableCredentialWithType<T> {
    constructor(vc: VCWithTypeType<T>) {
        super(vc);
    }

    /**
     * Creates a signed Message object
     *
     * @inheritdoc override me if the payload type requires ad-hoc decoding, by calling the child class constructor
     *
     * @param {object} message the message
     * @param {Issuer} issuer the issuer id
     * @param {DIDUrl} recipient the recipient id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a message object
     */
    protected static async signMessageWithRecipient<T extends object = object>(
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
export type AuthenticationMessagePayload = Record<string, never>;
export class AuthenticationMessage extends Message<AuthenticationMessagePayload> {
    static async signMessageWithoutRecipient<AuthenticationMessagePayload>(
        message: AuthenticationMessagePayload,
        issuer: Issuer,
        options?: { subject?: string | undefined }
    ) {
        const vc = await super.signMessageWithRecipient(message as any, issuer, '', options);

        return new AuthenticationMessage(vc);
    }
}

// empty object
export type IdentifyMessagePayload = Record<string, never>;
export class IdentifyMessage extends Message<IdentifyMessagePayload> {
    static async signMessage(
        message: IdentifyMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<IdentifyMessagePayload>(message, issuer, recipient, options);

        return new IdentifyMessage(vc);
    }
}

export type LoginRequestsMessagePayload = {
    requests: LoginRequest[];
};

export class LoginRequestsMessage extends Message<LoginRequestsMessagePayload> {
    constructor(
        vc: LoginRequestsMessage | Message<LoginRequestsMessagePayload> | VCWithTypeType<LoginRequestsMessagePayload>
    ) {
        super(vc);
        const payload = this.getVc().getPayload().vc.credentialSubject.payload;

        if (!payload.requests) {
            throw new Error('LoginRequestsMessage must have a requests property');
        }

        this.decodedPayload = { requests: payload.requests.map((request: string) => new LoginRequest(request)) };
    }

    static async signMessage(
        message: LoginRequestsMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<LoginRequestsMessagePayload>(
            message,
            issuer,
            recipient,
            options
        );

        return new LoginRequestsMessage(vc);
    }
}

export type LoginRequestResponseMessagePayload = {
    success: boolean;
    error?: {
        code: SdkErrors;
        reason: string;
    };
    requests?: LoginRequest[];
    accountName?: Name;
    username?: TonomyUsername;
};
export class LoginRequestResponseMessage extends Message<LoginRequestResponseMessagePayload> {
    constructor(
        vc:
            | LoginRequestResponseMessage
            | Message<LoginRequestResponseMessagePayload>
            | VCWithTypeType<LoginRequestResponseMessagePayload>
    ) {
        super(vc);
        const payload = this.getVc().getPayload().vc.credentialSubject.payload;

        if (payload.success) {
            if (!payload.requests) {
                throw new Error('LoginRequestsMessage must have a requests property');
            }

            this.decodedPayload = {
                ...payload,
                requests: payload.requests.map((request: string) => new LoginRequest(request)),
                accountName: Name.from(payload.accountName),
                username: payload.username.username
                    ? new TonomyUsername(payload.username.username)
                    : new TonomyUsername(payload.username),
            };
        }
    }

    static async signMessage(
        message: LoginRequestResponseMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<LoginRequestResponseMessagePayload>(
            message,
            issuer,
            recipient,
            options
        );

        return new LoginRequestResponseMessage(vc);
    }
}
