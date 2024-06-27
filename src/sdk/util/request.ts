import { PublicKey } from '@wharfkit/antelope';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from 'did-jwt-vc';

export class WalletRequest<T extends object = any> extends VerifiableCredentialWithType<T> {
    protected static type = 'WalletRequest';

    /**
     * @inheritdoc override me if the payload type requires ad-hoc decoding
     */
    constructor(vc: VCWithTypeType<T>) {
        super(vc);
    }

    /**
     * Alternative constructor that returns type WalletRequest. To be used in derived classes
     *
     * @access protected
     *
     * @param {object} payload the payload
     * @param {Issuer} issuer the issuer id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a WalletRequest object
     */
    protected static async signWalletRequest<T extends object = object>(
        payload: T,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<WalletRequest<T>> {
        if (this.type === 'WalletRequest') {
            throw new Error('class should be a derived class of WalletRequest to use the type property');
        }

        const vc = await super.sign<T>(payload, issuer, options);

        return new WalletRequest<T>(vc);
    }
}

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: PublicKey;
    callbackPath: string;
};

export class LoginRequest extends WalletRequest<LoginRequestPayload> {
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
        const vc = await super.signWalletRequest<LoginRequestPayload>(payload, issuer, options);

        return new LoginRequest(vc);
    }
}

export type DataSharingRequestPayload = {
    username: boolean;
    origin: string;
};

export class DataSharingRequest extends WalletRequest<DataSharingRequestPayload> {
    protected static type = 'DataSharingRequest';

    /**
     * Alternative constructor that returns type DataSharingRequest
     */
    static async signRequest(
        payload: DataSharingRequestPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.signWalletRequest<DataSharingRequestPayload>(payload, issuer, options);

        return new DataSharingRequest(vc);
    }
}
