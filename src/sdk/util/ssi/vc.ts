import { decodeJWT } from '@tonomy/did-jwt';
import { JWTDecoded, JWTPayload } from '@tonomy/did-jwt/lib/JWT';
import { DIDurl, URL, JWT, JWTVCPayload } from './types';
import { getSettings } from '../settings';
import { Resolver } from '@tonomy/did-resolver';
import { getResolver } from '@tonomy/antelope-did-resolver';
import { getResolver as getJwkResolver } from './did-jwk';
import crossFetch from 'cross-fetch';
import {
    verifyCredential,
    W3CCredential,
    Issuer,
    createVerifiableCredentialJwt,
    VerifiedCredential,
} from '@tonomy/did-jwt-vc';
import { toDateTime } from '../time';
import { randomString } from '../crypto';
import { Serializable } from '../serializable';

/**
 * A W3C Verifiable Credential
 */
export class VerifiableCredential<T extends object = object> {
    private decodedJwt: JWTDecoded;
    private jwt: JWT;

    /**
     * @param {JWT} jwt - a JWT string
     *
     * @returns {VerifiableCredential} a VerifiableCredential object
     */
    constructor(jwt: JWT) {
        this.decodedJwt = decodeJWT(jwt);
        this.jwt = jwt;
    }

    /**
     * Returns the payload of the JWT
     *
     * @returns {JWTPayload} the payload of the JWT
     */
    getPayload(): JWTPayload {
        return this.decodedJwt.payload;
    }

    /**
     * Returns the vc object of the JWT
     *
     * @returns {JWTVCPayload} the vc object
     */
    getVc(): JWTVCPayload {
        return this.getPayload().vc;
    }

    /**
     * Returns the credentialSubject object of the Verifiable Credential
     *
     * @returns {any} the credentialSubject object
     */
    getCredentialSubject(): T {
        return this.getVc().credentialSubject;
    }

    /**
     * Returns the issuer of the Verifiable Credential
     *
     * @returns {DIDurl | undefined} the issuer
     */
    getIssuer(): DIDurl {
        return this.getPayload().iss as DIDurl;
    }

    /**
     * Returns the subject of the Verifiable Credential
     *
     * @returns {DIDurl | undefined} the subject of the Verifiable Credential
     */
    getSubject(): DIDurl | undefined {
        return this.getPayload().sub;
    }

    /**
     * Returns the ID of the Verifiable Credential
     *
     * @returns {URL | undefined} the id
     */
    getId(): URL | undefined {
        return this.getPayload().jti;
    }

    /**
     * Returns the audience of the Verifiable Credential
     *
     * @returns {DIDurl | DIDurl[] | undefined} the audience
     */
    getAudience(): DIDurl | DIDurl[] | undefined {
        return this.getPayload().aud;
    }

    /**
     * Returns the expiration of the Verifiable Credential
     *
     * @returns {Date | undefined} the expiration
     */
    getExpiration(): Date | undefined {
        const secSinceEpoc = this.getPayload().exp;

        if (secSinceEpoc) {
            return toDateTime(secSinceEpoc);
        } else return undefined;
    }

    /**
     * Returns the issued time of the Verifiable Credential
     *
     * @returns {Date | undefined} the issued time
     */
    getIssuedAt(): Date | undefined {
        const secSinceEpoc = this.getPayload().iat;

        if (secSinceEpoc) {
            return toDateTime(secSinceEpoc);
        } else return undefined;
    }

    /**
     * Returns the time the verifiable credential is valid after
     *
     * @returns {Date | undefined} the time the verifiable credential is valid after
     */
    getNotBefore(): Date | undefined {
        const secSinceEpoc = this.getPayload().nbf;

        if (secSinceEpoc) {
            return toDateTime(secSinceEpoc);
        } else return undefined;
    }

    /**
     * Verifies the Verifiable Credential is signed by the issuer
     *
     * @returns {Promise<VerifiedCredential>} the verified credential
     * @throws {Error} if the Verifiable Credential is not signed correctly by the issuer
     */
    async verify(): Promise<VerifiedCredential> {
        const settings = getSettings();

        const resolver = new Resolver({
            ...getJwkResolver(),
            ...getResolver({ antelopeChainUrl: settings.blockchainUrl, fetch: crossFetch as any }),
        });

        return verifyCredential(this.jwt, resolver);
    }

    /**
     * Creates a new Verifiable Credential object signed by the issuer
     *
     * @param {DIDurl} id - the id of the Verifiable Credential
     * @param {string[]} type - the type of the Verifiable Credential
     * @param {object} credentialSubject - the credential subject of the Verifiable Credential
     * @param {Issuer} issuer - the issuer of the Verifiable Credential
     * @property {URL} [options.subject] - the subject of the Verifiable Credential
     *
     * @returns {Promise<VerifiableCredential>} the Verifiable Credential
     */
    static async sign<T extends object = object>(
        id: DIDurl,
        type: string[],
        credentialSubject: T,
        issuer: Issuer,
        options: {
            subject?: URL;
        } = {}
    ): Promise<VerifiableCredential<T>> {
        const vc: W3CCredential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id,
            type,
            issuer: {
                id: issuer.did,
            },
            issuanceDate: new Date().toISOString(),
            credentialSubject: credentialSubject as any,
        };

        if (options.subject) vc.credentialSubject.id = options.subject;

        const jwt = await createVerifiableCredentialJwt(vc, issuer, { canonicalize: true });

        return new VerifiableCredential<T>(jwt);
    }

    /**
     * Returns the JWT string
     *
     * @returns {string} the JWT string
     */
    toString(): string {
        return this.jwt;
    }

    /**
     * Returns the JWT string, called by JSON.stringify
     *
     * @returns {string} the JWT string
     */
    toJSON(): string {
        return this.toString();
    }
}

export type VerifiableCredentialOptions = {
    subject?: URL;
    additionalTypes?: string[];
};

export type VCWithTypeType<T extends object = object> =
    | VerifiableCredential<{ payload: T; type: string }>
    | VerifiableCredentialWithType<T>
    | JWT;

/**
 * A wrapper that adds a type object to VCs to allow for identification, and presents a simper interface
 *
 * This is the base class. It is expected that extension classes will be created for the different VC types.
 *
 * @inheritdoc sign() is a protected alternative constructor. In child classes, a new alternative constructor
 * should be created which returns the child class type.
 * @inheritdoc if the payload type requires ad-hoc decoding, override the constructor and decode the payload
 *
 * @example see an example of the above in the LoginRequestMessage class in `../..services/communication/messages.ts`
 */
export class VerifiableCredentialWithType<T extends object = object> implements Serializable {
    private vc: VerifiableCredential<{ payload: T; type: string }>;
    protected decodedPayload: T;

    /**
     *
     * @param vc the VC to wrap
     *
     * @inheritdoc override me if the payload type requires ad-hoc decoding
     */
    constructor(vc: VCWithTypeType<T>) {
        if (typeof vc === 'string') {
            this.vc = new VerifiableCredential<{ payload: T; type: string }>(vc);
        } else if (vc instanceof VerifiableCredentialWithType) {
            this.vc = vc.getVc() as VerifiableCredential<{ payload: T; type: string }>;
        } else {
            this.vc = vc;
        }

        this.decodedPayload = this.getVc().getCredentialSubject().payload;
    }

    /**
     * Creates a signed VC object
     *
     * @access protected
     *
     * @param {object} payload the payload
     * @param {Issuer} issuer the issuer id
     * @param {VerifiableCredentialOptions} options the options
     *
     * @returns a VC object
     */
    protected static async sign<T extends object = object>(
        payload: T,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<VerifiableCredentialWithType<T>> {
        const payloadType = this.name;

        if (
            payloadType === VerifiableCredentialWithType.name ||
            payloadType === 'VerifiableCredentialWithType' ||
            payloadType === ''
        ) {
            throw new Error('class should be a derived class of VerifiableCredentialWithType to use the type property');
        }

        const credentialSubject = Object.assign({}, { payload, type: payloadType });

        const id = 'https://tonomy.foundation/vc/id/' + randomString(10);
        const vcType = ['VerifiableCredential', 'TonomyVerifiableCredentialWithType'];

        if (options.additionalTypes) {
            vcType.push(...options.additionalTypes);
        }

        const vc = await VerifiableCredential.sign<{ payload: T; type: string }>(
            id,
            vcType,
            credentialSubject,
            issuer,
            options
        );

        return new VerifiableCredentialWithType<T>(vc);
    }

    /**
     * Returns the type of the VC
     * @returns {string} the class type of the VC
     */
    static getType(): string {
        return this.name;
    }

    /**
     * Returns the internal Verifiable Credential
     * @returns {VerifiableCredential} the VC
     */
    getVc(): VerifiableCredential<{ payload: T; type: string }> {
        return this.vc;
    }

    /**
     * Returns the issuer of the payload
     * @returns {DIDurl} the payload issuer
     */
    getIssuer(): DIDurl {
        return this.getVc().getIssuer();
    }

    /**
     * Returns the payload
     * @returns {object} the payload
     */
    getPayload(): T {
        return this.decodedPayload;
    }

    /**
     * Returns the payload type used to determine what kind of payload it is
     * @returns {string | undefined} the payload type
     */
    getType(): string | undefined {
        return this.getVc().getCredentialSubject().type;
    }

    /**
     * Verifies that the VC is signed by the issuer
     *
     * @returns {Promise<boolean>} true if the VC is signed by the issuer
     * @throws {Error} if the VC is not signed by the issuer
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

    /**
     * Returns the JWT string, called by JSON.stringify
     *
     * @overrides Serializable
     *
     * @returns {string} the JWT string
     */
    toJSON(): string {
        return this.toString();
    }
}
