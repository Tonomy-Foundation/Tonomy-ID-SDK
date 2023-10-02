import { VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from '@tonomy/did-jwt-vc';

export type DataSharingRequestPayload = {
    username: boolean;
};

export class DataSharingRequest extends VerifiableCredentialWithType<DataSharingRequestPayload> {
    protected static type = 'DataSharingRequest';

    /**
     * Alternative constructor that returns type DataSharingRequest
     */
    static async signRequest(
        payload: DataSharingRequestPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ) {
        const vc = await super.sign<DataSharingRequestPayload>(payload, issuer, options);

        return new DataSharingRequest(vc);
    }
}
