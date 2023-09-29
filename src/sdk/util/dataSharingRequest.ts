import { PublicKey } from '@wharfkit/antelope';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from '@tonomy/did-jwt-vc';

export type DataSharingRequestPayload = {
    username: string;
    origin: string;
    publicKey: PublicKey;
    callbackPath: string;
};

export class DataSharingRequest extends VerifiableCredentialWithType<DataSharingRequestPayload> {
    protected static type = 'DataSharingRequest';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type DataSharingRequestPayload
     */
    constructor(vc: DataSharingRequest | VCWithTypeType<DataSharingRequestPayload>) {
        super(vc);
        this.decodedPayload.publicKey = PublicKey.from(super.getPayload().publicKey);
    }

    /**
     * Alternative constructor that returns type DataSharingRequest
     */
    static async createRequest(
        payload: DataSharingRequestPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.sign<DataSharingRequestPayload>(payload, issuer, options);

        return new DataSharingRequest(vc);
    }
}
