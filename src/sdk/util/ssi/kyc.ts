import { VerifiableCredentialWithType, VerifiableCredentialOptions } from './vc';
import { VeriffWebhookPayload } from '../veriff';
import { Issuer } from 'did-jwt-vc';

export class KYCVerifiableCredential extends VerifiableCredentialWithType<VeriffWebhookPayload['data']> {
    protected static type = 'KYC';

    /**
     * Alternative constructor that returns type KYCVerifiableCredential
     */
    static async signCredential(
        payload: VeriffWebhookPayload['data'],
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<KYCVerifiableCredential> {
        const vc = await super.sign(payload, issuer, options);

        return new KYCVerifiableCredential(vc);
    }
}
