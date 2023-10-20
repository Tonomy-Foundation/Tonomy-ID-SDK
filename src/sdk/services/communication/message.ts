import { Issuer } from '@tonomy/did-jwt-vc';
import { DIDurl, URL } from '../../util/ssi/types';
import { VerifiableCredentialWithType, VCWithTypeType } from '../../util/ssi/vc';
import { DataSharingRequest, LoginRequest } from '../../util/request';
import { TonomyRequest } from '../../util';
import { TonomyUsername } from '../../util/username';
import { Name } from '@wharfkit/antelope';
import { SdkErrors, throwError } from '../../util/errors';

/**
 * A message that can be sent between two Tonomy identities
 *
 * @inheritdoc signMessageWithRecipient() is a protected alternative constructor. In child classes,
 * a new alternative constructor called signMessage() should be created which returns the child class type.
 * @inheritdoc protected "type" property should be overridden in child classes with the name of the class
 * @inheritdoc if the payload type requires ad-hoc decoding, override the constructor and decode the payload
 *
 * @example see an example of the above in the LoginRequestMessage class
 */
export class Message<T extends object = any> extends VerifiableCredentialWithType<T> {
    protected static type = 'Message';

    /**
     * @inheritdoc override me if the payload type requires ad-hoc decoding
     */
    constructor(vc: VCWithTypeType<T>) {
        super(vc);
    }

    /**
     * Alternative constructor that returns type Message
     *
     * @access protected
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
        if (this.type === 'Message') {
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
    protected static type = 'AuthenticationMessage';

    /**
     * Alternative constructor that returns type AuthenticationMessage
     */
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
    protected static type = 'IdentifyMessage';

    /**
     * Alternative constructor that returns type IdentifyMessage
     */
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
    requests: TonomyRequest[];
};

export class LoginRequestsMessage extends Message<LoginRequestsMessagePayload> {
    protected static type = 'LoginRequestsMessage';

    /**
     * @override the Message constructor to decode the payload of type LoginRequestsMessagePayload
     */
    constructor(
        vc: LoginRequestsMessage | Message<LoginRequestsMessagePayload> | VCWithTypeType<LoginRequestsMessagePayload>
    ) {
        super(vc);
        const payload = this.getVc().getPayload().vc.credentialSubject.payload;

        if (!payload.requests) {
            throw new Error('LoginRequestsMessage must have a requests property');
        }

        const requests = payload.requests.map((request: string) => new TonomyRequest(request));

        this.decodedPayload = {
            requests: requests.map((request: TonomyRequest) => {
                if (request.getType() === LoginRequest.getType()) {
                    return new LoginRequest(request);
                } else if (request.getType() === DataSharingRequest.getType()) {
                    return new DataSharingRequest(request);
                } else {
                    throwError(
                        "Request type must be 'LoginRequest' or 'DataSharingRequest'",
                        SdkErrors.InvalidRequestType
                    );
                }
            }),
        };
    }

    /**
     * Alternative constructor that returns type LoginRequestsMessage
     */
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

export type LoginResponse = {
    accountName: Name;
    data?: {
        username?: TonomyUsername;
    };
};

export type LoginRequestResponseMessagePayload = {
    success: boolean;
    requests: TonomyRequest[];
    error?: {
        code: SdkErrors;
        reason: string;
    };
    response?: LoginResponse;
};
export class LoginRequestResponseMessage extends Message<LoginRequestResponseMessagePayload> {
    protected static type = 'LoginRequestResponseMessage';

    /**
     * @override the Message constructor to decode the payload of type LoginRequestResponseMessagePayload
     */
    constructor(
        vc:
            | LoginRequestResponseMessage
            | Message<LoginRequestResponseMessagePayload>
            | VCWithTypeType<LoginRequestResponseMessagePayload>
    ) {
        super(vc);
        const payload = this.getVc().getPayload().vc.credentialSubject.payload;

        const requests = payload.requests.map((request: string) => new TonomyRequest(request));

        this.decodedPayload = {
            ...payload,
            requests: requests.map((request: TonomyRequest) => {
                if (request.getType() === LoginRequest.getType()) {
                    return new LoginRequest(request);
                } else if (request.getType() === DataSharingRequest.getType()) {
                    return new DataSharingRequest(request);
                } else {
                    throwError(
                        "Request type must be 'LoginRequest' or 'DataSharingRequest'",
                        SdkErrors.InvalidRequestType
                    );
                }
            }),
        };

        if (payload.success) {
            const response: LoginResponse = {
                accountName: Name.from(payload.response.accountName),
            };

            if (payload.response.data?.username) {
                response.data = {
                    username: payload.response.data.username.username
                        ? new TonomyUsername(payload.response.data.username.username)
                        : new TonomyUsername(payload.response.data.username),
                };
            }

            this.decodedPayload = {
                ...this.decodedPayload,
                response,
            };
        }
    }

    /**
     * Alternative constructor that returns type LoginRequestResponseMessage
     */
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

export type LinkAuthRequestMessagePayload = {
    contract: Name; //code in the eosio contract
    action: Name; //type in the eosio contract
};

export class LinkAuthRequestMessage extends Message<LinkAuthRequestMessagePayload> {
    protected static type = 'LinkAuthRequestMessage';

    /**
     * @override the Message constructor to decode the payload of type LinkAuthRequestMessagePayload
     */
    constructor(
        vc:
            | LinkAuthRequestMessage
            | Message<LinkAuthRequestMessagePayload>
            | VCWithTypeType<LinkAuthRequestMessagePayload>
    ) {
        super(vc);
        const payload = this.getVc().getPayload().vc.credentialSubject.payload;

        this.decodedPayload = {
            contract: Name.from(payload.contract),
            action: Name.from(payload.action),
        };
    }

    /**
     * Alternative constructor that returns type LoginRequestResponseMessage
     */
    static async signMessage(
        message: LinkAuthRequestMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<LinkAuthRequestMessagePayload>(
            message,
            issuer,
            recipient,
            options
        );

        return new LinkAuthRequestMessage(vc);
    }
}

export type LinkAuthRequestResponseMessagePayload = {
    requestId: string;
    success: boolean;
};

export class LinkAuthRequestResponseMessage extends Message<LinkAuthRequestResponseMessagePayload> {
    protected static type = 'LinkAuthRequestResponseMessage';

    /**
     * Alternative constructor that returns type LinkAuthRequestResponseMessage
     */
    static async signMessage(
        message: LinkAuthRequestResponseMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<LinkAuthRequestResponseMessagePayload>(
            message,
            issuer,
            recipient,
            options
        );

        return new LinkAuthRequestResponseMessage(vc);
    }
}
