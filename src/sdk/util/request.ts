import { PublicKey } from '@greymass/eosio';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from '@tonomy/did-jwt-vc';

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: PublicKey;
    callbackPath?: string;
};

export class LoginRequest extends VerifiableCredentialWithType<LoginRequestPayload> {
    constructor(vc: LoginRequest | VCWithTypeType<LoginRequestPayload>) {
        super(vc);
        this.decodedPayload.publicKey = PublicKey.from(super.getPayload().publicKey);
    }

    static async signRequest(payload: LoginRequestPayload, issuer: Issuer, options: VerifiableCredentialOptions = {}) {
        const vc = await super.sign<LoginRequestPayload>(payload, issuer, options);

        return new LoginRequest(vc);
    }
}
