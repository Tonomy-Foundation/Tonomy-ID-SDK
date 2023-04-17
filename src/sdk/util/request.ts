import { PublicKey } from '@greymass/eosio';
import { VerifiableCredentialWithType } from './ssi/vc';

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: PublicKey;
    callbackPath?: string;
};
export class LoginRequest extends VerifiableCredentialWithType<LoginRequestPayload> { }

// empty object
export type AuthenticationRequestPayload = Record<string, never>;
export class AuthenticationRequest extends VerifiableCredentialWithType<AuthenticationRequestPayload> { }
