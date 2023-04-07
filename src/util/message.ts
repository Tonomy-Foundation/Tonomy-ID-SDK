import { decodeJWT } from '@tonomy/did-jwt';
import { Issuer, verifyCredential, W3CCredential } from '@tonomy/did-jwt-vc';
import { getSettings } from '../settings';
import { JWTDecoded } from '@tonomy/did-jwt/lib/JWT';
import crossFetch from 'cross-fetch';
import { getResolver } from '@tonomy/antelope-did-resolver';
import { Resolver } from '@tonomy/did-resolver';
import { issue, OutputType } from '@tonomy/antelope-ssi-toolkit';
import { resolve } from './did-jwk';

export enum MessageType {
    SERVICE_LOGIN = 'SERVICE_LOGIN',
    IDENTIFY = 'IDENTIFY',
    LOGIN_REQUEST = 'LOGIN_REQUEST',
    LOGIN_REQUEST_RESPONSE = 'LOGIN_REQUEST_RESPONSE',
}

export class Message {
    private decodedJwt: JWTDecoded;

    /**
     * creates a signed message and return message object
     * @param message the messageResolver with the signer and the did
     * @param recipient the recipient id
     * @param type the message type
     * @returns a message objects
     */
    static async sign(message: object, issuer: Issuer, recipient?: string, type?: string): Promise<Message> {
        const vc: W3CCredential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: 'https://example.com/id/1234324',
            type: ['VerifiableCredential', 'TonomyMessage'],
            issuer: {
                id: issuer.did,
            },
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                message,
            },
        };

        // add recipient to vc if given
        if (recipient) vc.credentialSubject.id = recipient;
        if (type) vc.credentialSubject.type = type;

        const result = await issue(vc, {
            issuer: issuer,
            outputType: OutputType.JWT,
        });

        return new Message(result);
    }

    constructor(public jwt: string) {
        this.decodedJwt = decodeJWT(jwt);
        this.jwt = jwt;
    }

    // Returns the sender of the message (iss property of the signed VC)
    getSender(): string {
        return this.decodedJwt.payload.iss as string;
    }
    // Returns the recipient of the message (sub property of the signed VC)
    getRecipient(): string {
        return this.decodedJwt.payload.sub as string;
    }

    // Returns the original unsigned payload
    getPayload(): any {
        return this.decodedJwt.payload.vc.credentialSubject.message;
    }

    /**
     * Returns the message type This is used to determine what kind of message it is
     * @returns {string} the message type
     */
    getType(): any {
        return this.decodedJwt.payload.vc.credentialSubject.type;
    }

    /* Verifies the VC. True if valid
     * this is setup to resolve did:antelope and did:jwk DIDs
     */
    async verify(): Promise<boolean> {
        const settings = getSettings();

        //TODO: use compatible resolver for the didjwk resolver
        const jwkResolver: any = {
            resolve,
        };
        // const resolver = {
        //     resolve: new AntelopeDID({ fetch: crossFetch, antelopeChainUrl: settings.blockchainUrl }).resolve,
        // };
        const resolver = new Resolver({
            ...getResolver({ antelopeChainUrl: settings.blockchainUrl, fetch: crossFetch as any }),
        });

        try {
            const result = await Promise.any([
                verifyCredential(this.jwt, { resolve: jwkResolver.resolve }),
                verifyCredential(this.jwt, resolver),
            ]);

            return result.verified;
        } catch (e) {
            return false;
        }
    }
}
