import { decodeJWT } from '@tonomy/did-jwt';
import { issue, OutputType } from '@tonomy/antelope-ssi-toolkit';
import { Issuer, verifyCredential, W3CCredential } from '@tonomy/did-jwt-vc';

// import { Resolver } from '@tonomy/did-resolver';
import { getSettings } from '../settings';
import AntelopeDID from '@tonomy/antelope-did';
import { JWTDecoded } from '@tonomy/did-jwt/lib/JWT';
import fetch from 'cross-fetch';
// import { getSettings } from '../settings';

export class Message {
    private decodedJwt: JWTDecoded;

    /**
     * creates a signed message and return message object
     * @param message the messageResolver with the signer and the did
     * @param recipient the recipient id
     * @returns a message objects
     */
    static async sign(message: object, issuer: Issuer, recipient?: string): Promise<Message> {
        const vc: W3CCredential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            // should this be tonomy foundation ?
            id: 'https://example.com/id/1234324',
            type: ['VerifiableCredential'],
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

    // // Returns the message type (ignores VerifiableCredential type). This is used to determine what kind of message it is (login request, login request confirmation etc...) so the client can choose what to do with it
    // getType(): string {}

    /* Verifies the VC. True if valid
     * this is setup to resolve did:antelope and did:jwk DIDs
     */
    async verify(): Promise<boolean> {
        const settings = getSettings();

        //TODO: use compatible resolver for the didjwk resolver
        // const jwkResolver: any = {
        //     resolve,
        // };
        const resolver = {
            resolve: new AntelopeDID({ fetch: fetch, chain: settings.blockchainUrl }).resolve,
        };

        // const antelopeResolver = {
        //     resolve(did: string) {
        //         getResolver().antelope(did,);
        //     },
        // };

        // const result = await Promise.any([
        //     verifyCredential(this.jwt, { resolve: jwkResolver.resolve }),
        //     verifyCredential(this.jwt, resolver),
        // ]);

        const result = await verifyCredential(this.jwt, resolver);

        return result.verified;
    }
}
