import { VerifiableCredentialWithType } from './ssi/vc';

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};
export class LoginRequest extends VerifiableCredentialWithType<LoginRequestPayload> { }

// empty object
export type AuthenticationRequestPayload = Record<string, never>;
export class AuthenticationRequest extends VerifiableCredentialWithType<AuthenticationRequestPayload> { }
