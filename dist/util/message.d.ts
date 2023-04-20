import { Issuer } from '@tonomy/did-jwt-vc';
export declare class Message {
    jwt: string;
    private decodedJwt;
    /**
     * creates a signed message and return message object
     * @param message the messageResolver with the signer and the did
     * @param recipient the recipient id
     * @returns a message objects
     */
    static sign(message: object, issuer: Issuer, recipient?: string): Promise<Message>;
    constructor(jwt: string);
    getSender(): string;
    getRecipient(): string;
    getPayload(): any;
    verify(): Promise<boolean>;
}
