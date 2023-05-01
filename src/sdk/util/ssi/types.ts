export type URI = string;
export type URL = string;

export type DID = URI;
export type DIDurl = URL;

export type JWT = string;

export type JWTVCPayload = {
    '@context': string[];
    credentialSubject: any;
    type: string[];
};

export type Extensible<T> = T & { [x: string]: any };
