import { Name } from '@wharfkit/antelope';
import { TonomyUsername } from './username';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from '@tonomy/did-jwt-vc';
import { SdkErrors, throwError } from './errors';

export class WalletRequestResponse<T extends object = any> extends VerifiableCredentialWithType<T> {
    protected static type = 'WalletRequestResponse';

    /**
     * @inheritdoc override me if the payload type requires ad-hoc decoding
     */
    constructor(vc: VCWithTypeType<T>) {
        super(vc);
    }

    /**
     * Alternative constructor that returns type WalletRequestResponse. To be used in derived classes
     *
     * @access protected
     *
     * @param {object} payload the payload
     * @param {Issuer} issuer the issuer id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a WalletRequestResponse object
     */
    protected static async signWalletResponse<T extends object = object>(
        payload: T,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<WalletRequestResponse<T>> {
        if (this.type === 'WalletRequest') {
            throw new Error('class should be a derived class of WalletRequest to use the type property');
        }

        const vc = await super.sign<T>(payload, issuer, options);

        return new WalletRequestResponse<T>(vc);
    }
}

type LoginRequestResponsePayload = {
    accountName: Name;
};

export class LoginRequestResponse extends WalletRequestResponse<LoginRequestResponsePayload> {
    protected static type = 'LoginRequestResponse';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type LoginRequestPayload
     */
    constructor(vc: LoginRequestResponse | VCWithTypeType<LoginRequestResponsePayload>) {
        super(vc);
        this.decodedPayload.accountName = Name.from(super.getPayload().accountName);
    }

    /**
     * Alternative constructor that returns type LoginRequestResponse
     */
    static async signResponse(
        payload: LoginRequestResponsePayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.signWalletResponse<LoginRequestResponsePayload>(payload, issuer, options);

        return new LoginRequestResponse(vc);
    }
}

export type DataSharingRequestResponseData = {
    username?: TonomyUsername;
};

export type DataSharingRequestResponsePayload = {
    data: DataSharingRequestResponseData;
};

export class DataRequestResponse extends WalletRequestResponse<DataSharingRequestResponsePayload> {
    protected static type = 'DataRequestResponse';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type DataSharingRequestResponsePayload
     */
    constructor(vc: DataRequestResponse | VCWithTypeType<DataSharingRequestResponsePayload>) {
        super(vc);

        if (this.decodedPayload.data.username && typeof this.decodedPayload.data.username === 'string') {
            this.decodedPayload.data.username = new TonomyUsername(this.decodedPayload.data.username);
        }
    }

    /**
     * Alternative constructor that returns type DataRequestResponse
     */
    static async signResponse(
        payload: DataSharingRequestResponsePayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.signWalletResponse<DataSharingRequestResponsePayload>(payload, issuer, options);

        return new DataRequestResponse(vc);
    }
}
