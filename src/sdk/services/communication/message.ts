import { Issuer } from 'did-jwt-vc';
import { DIDurl, URL } from '../../util/ssi/types';
import { VerifiableCredentialWithType, VCWithTypeType } from '../../util/ssi/vc';
import { DualWalletRequests, DualWalletResponse } from '../../util';
import { Name } from '@wharfkit/antelope';
import Debug from 'debug';
import {
    VerificationMessagePayload,
    KYCVC,
    FirstNameVC,
    LastNameVC,
    BirthDateVC,
    AddressVC,
    NationalityVC,
} from '../../util/veriff';
import Decimal from 'decimal.js';

const debug = Debug('tonomy-sdk:services:communication:message');

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
        const request = await super.sign<T>(message, issuer, newOptions);

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

export class LoginRequestsMessage extends Message<DualWalletRequests> {
    protected static type = 'LoginRequestsMessage';

    /**
     * @override the Message constructor to decode the payload of type DualWalletRequests
     */
    constructor(vc: Message<DualWalletRequests> | VCWithTypeType<DualWalletRequests>) {
        super(vc);
        this.decodedPayload = DualWalletRequests.fromString(this.decodedPayload as unknown as string);
    }

    /**
     * Alternative constructor that returns type LoginRequestsMessage
     */
    static async signMessage(
        message: DualWalletRequests,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<DualWalletRequests>(message, issuer, recipient, options);

        return new LoginRequestsMessage(vc);
    }

    async verify(): Promise<boolean> {
        const ssoRequest = this.getPayload().sso;

        if (ssoRequest) {
            await ssoRequest.verify();
            if (ssoRequest.getDid() !== this.getIssuer())
                throw new Error('SSO request issuer does not match message issuer');
        }

        return super.verify();
    }
}

export class LoginRequestResponseMessage extends Message<DualWalletResponse> {
    protected static type = 'LoginRequestResponseMessage';

    /**
     * @override the Message constructor to decode the payload of type LoginRequestResponseMessagePayload
     */
    constructor(vc: LoginRequestResponseMessage | Message<DualWalletResponse> | VCWithTypeType<DualWalletResponse>) {
        super(vc);
        this.decodedPayload = DualWalletResponse.fromString(this.decodedPayload as unknown as string);

        debug(
            'LoginRequestResponseMessage payload',
            JSON.stringify(
                {
                    success: this.decodedPayload.success,
                    external: this.decodedPayload.external?.vc.getPayload(),
                    sso: this.decodedPayload.sso?.vc.getPayload(),
                    error: this.decodedPayload.error,
                    requests: this.decodedPayload.requests,
                },
                null,
                2
            )
        );
    }

    /**
     * Alternative constructor that returns type LoginRequestResponseMessage
     */
    static async signMessage(
        message: DualWalletResponse,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<DualWalletResponse>(message, issuer, recipient, options);

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

export class VerificationMessage extends Message<VerificationMessagePayload> {
    protected static type = 'VeriffVerificationMessage';
    public type: string;
    public payload: VerificationMessagePayload;

    constructor(vc: Message<VerificationMessagePayload> | VCWithTypeType<VerificationMessagePayload>) {
        super(vc);

        this.decodedPayload = {
            ...this.decodedPayload,
            kyc: new KYCVC(this.decodedPayload.kyc),
        };

        if (this.decodedPayload.firstName)
            this.decodedPayload.firstName = new FirstNameVC(this.decodedPayload.firstName);
        if (this.decodedPayload.lastName) this.decodedPayload.lastName = new LastNameVC(this.decodedPayload.lastName);
        if (this.decodedPayload.birthDate)
            this.decodedPayload.birthDate = new BirthDateVC(this.decodedPayload.birthDate);
        if (this.decodedPayload.address) this.decodedPayload.address = new AddressVC(this.decodedPayload.address);
        if (this.decodedPayload.nationality)
            this.decodedPayload.nationality = new NationalityVC(this.decodedPayload.nationality);
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
        const vc = await super.signMessageWithRecipient<VerificationMessagePayload>(
            message,
            issuer,
            recipient,
            options
        );

        return new VerificationMessage(vc);
    }
}

export class SwapTokenMessagePayload {
    amount: Decimal;
    baseAddress: string;
    proofOfBaseAddress: string;
    destination: ['Base', 'Tonomy'];
}

export class SwapTokenMessage extends Message<SwapTokenMessagePayload> {
    protected static type = 'SwapTokenMessage';

    constructor(vc: SwapTokenMessage | Message<SwapTokenMessagePayload> | VCWithTypeType<SwapTokenMessagePayload>) {
        super(vc);
        this.decodedPayload = {
            ...this.decodedPayload,
            amount: new Decimal(this.decodedPayload.amount),
        };
    }

    /**
     * Alternative constructor that returns type SwapTokenMessage
     */
    static async signMessage(
        message: SwapTokenMessagePayload,
        issuer: Issuer,
        recipient: DIDurl,
        options: { subject?: URL } = {}
    ) {
        const vc = await super.signMessageWithRecipient<SwapTokenMessagePayload>(message, issuer, recipient, options);

        return new SwapTokenMessage(vc);
    }
}
