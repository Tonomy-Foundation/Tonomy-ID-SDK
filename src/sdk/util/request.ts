import { Issuer } from '@tonomy/did-jwt-vc';
import { VerifiableCredential } from './ssi/vc';
import { DIDurl, JWT } from './ssi/types';
import { randomString } from './crypto';

/**
 * A request that a external application can make to a Tonomy ID wallet
 *
 * This is the base class. It is expected that extension classes will be created for the different request types.
 * See LoginRequest for an example.
 */
export class Request<T = object> {
    vc: VerifiableCredential<{ request: T; type: string }>;

    constructor(vc: VerifiableCredential<{ request: T; type: string }> | JWT) {
        if (typeof vc === 'string') {
            this.vc = new VerifiableCredential<{ request: T; type: string }>(vc);
        } else {
            this.vc = vc;
        }
    }

    /**
     * Creates a signed Request object
     *
     * @param {object} request the request
     * @param {Issuer} issuer the issuer id
     *
     * @returns a request object
     */
    static async sign<T = object>(request: T, issuer: Issuer): Promise<Request<T>> {
        const type = this.name;

        if (type === Request.name) {
            throw new Error('class should be a derived class of Request');
        }

        const credentialSubject = Object.assign({}, { request, type });

        const id = 'https://tonomy.foundation/request/id/' + randomString(10);

        const vc = await VerifiableCredential.sign<{ request: T; type: string }>(
            id,
            ['VerifiableCredential', 'TonomyRequest'],
            credentialSubject,
            issuer
        );

        return new Request<T>(vc);
    }

    /**
     * Returns the internal Verifiable Credential
     * @returns {VerifiableCredential} the VC
     */
    getVc(): VerifiableCredential<{ request: T; type: string }> {
        return this.vc;
    }

    /**
     * Returns the sender of the request
     * @returns {DIDurl} the request sender
     */
    getSender(): DIDurl {
        return this.getVc().getIssuer();
    }

    /**
     * Returns the request payload
     * @returns {object} the request
     */
    getPayload(): T {
        return this.getVc().getCredentialSubject().request;
    }

    /**
     * Returns the request type used to determine what kind of request it is
     * @returns {string | undefined} the request type
     */
    getType(): string | undefined {
        return this.getVc().getCredentialSubject().type;
    }

    /**
     * Verifies that the request is signed by the sender
     *
     * @returns {Promise<boolean>} true if the request is signed by the sender
     * @throws {Error} if the request is not signed by the sender
     */
    async verify(): Promise<boolean> {
        return (await this.getVc().verify()).verified;
    }

    /**
     * Returns the JWT string
     *
     * @returns {string} the JWT string
     */
    toString(): string {
        return this.getVc().toString();
    }
}

export type LoginRequestPayload = {
    randomString: string;
    origin: string;
    publicKey: string;
    callbackPath?: string;
};

export class LoginRequest extends Request<LoginRequestPayload> { }
