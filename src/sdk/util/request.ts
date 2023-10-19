import { PublicKey } from '@wharfkit/antelope';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from '@tonomy/did-jwt-vc';

export class TonomyRequest<T extends object = any> extends VerifiableCredentialWithType<T> {
    protected static type = 'TonomyRequest';

    /**
     * @inheritdoc override me if the payload type requires ad-hoc decoding
     */
    constructor(vc: VCWithTypeType<T>) {
        super(vc);
    }

    /**
     * Alternative constructor that returns type TonomyRequest. To be used in derived classes
     *
     * @access protected
     *
     * @param {object} payload the payload
     * @param {Issuer} issuer the issuer id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a TonomyRequest object
     */
    protected static async signTonomyRequest<T extends object = object>(
        payload: T,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<TonomyRequest<T>> {
        if (this.type === 'TonomyRequest') {
            throw new Error('class should be a derived class of TonomyRequest to use the type property');
        }

        const vc = await super.sign<T>(payload, issuer, options);

        return new TonomyRequest<T>(vc);
    }
}

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: PublicKey;
    callbackPath: string;
};

export class LoginRequest extends TonomyRequest<LoginRequestPayload> {
    protected static type = 'LoginRequest';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type LoginRequestPayload
     */
    constructor(vc: LoginRequest | VCWithTypeType<LoginRequestPayload>) {
        super(vc);
        this.decodedPayload.publicKey = PublicKey.from(super.getPayload().publicKey);
    }

    /**
     * Alternative constructor that returns type LoginRequest
     */
    static async signRequest(payload: LoginRequestPayload, issuer: Issuer, options: VerifiableCredentialOptions = {}) {
        const vc = await super.signTonomyRequest<LoginRequestPayload>(payload, issuer, options);

        return new LoginRequest(vc);
    }
}

export type DataSharingRequestPayload = {
    username: boolean;
};

export class DataSharingRequest extends TonomyRequest<DataSharingRequestPayload> {
    protected static type = 'DataSharingRequest';

    /**
     * Alternative constructor that returns type DataSharingRequest
     */
    static async signRequest(
        payload: DataSharingRequestPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.signTonomyRequest<DataSharingRequestPayload>(payload, issuer, options);

        return new DataSharingRequest(vc);
    }
}
