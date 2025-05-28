import { Name, PublicKey } from '@wharfkit/antelope';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from 'did-jwt-vc';
import { App } from '../controllers/App';
import { IUserRequestsManager } from '../types/User';
import { SdkError, SdkErrors } from './errors';
import { Serializable } from './serializable';
import { base64UrlToObj, objToBase64Url } from './base64';
import { TonomyUsername } from './username';
import { verifyKeyExistsForApp } from '../helpers/user';
import { getAccountNameFromDid } from './ssi/did';

export type WalletResponseError = { code: SdkErrors; reason: string };

export type LoginRequestPayload = {
    login: {
        randomString: string;
        origin: string;
        publicKey: PublicKey;
        callbackPath: string;
    };
};

export type DataRequest = {
    username?: boolean;
    // verified: {
    //     kyc: boolean;
    //     firstName: boolean;
    //     lastName: boolean;
    //     address: boolean;
    //     birthdate: boolean;
    //     nationality: boolean;
    // };
};

export type DataSharingRequestPayload = {
    data: DataRequest;
};

export type WalletRequestPayloadType = LoginRequestPayload | DataSharingRequestPayload;

export type WalletRequestPayload = {
    requests: WalletRequestPayloadType[];
};

export type LoginRequestResponsePayload = {
    login: {
        origin: string;
        callbackPath: string;
    };
};

export type DataSharingResponsePayload = {
    data: {
        username?: TonomyUsername;
        // verified?: {
        //     kyc?: ...;
        //     firstName?: ...;
        //     lastName?: ...;
        //     address?: ...;
        //     birthDate?: ...;
    };
};

// TODO: these responses should contain the VC ID that was sent, so the receiver can verify the response
export type WalletResponsePayloadType = LoginRequestResponsePayload | DataSharingResponsePayload;

export type WalletResponsePayload = {
    success: boolean;
    error?: WalletResponseError;
    responses?: WalletResponsePayloadType[];
};

export class WalletRequestVerifiableCredential extends VerifiableCredentialWithType<WalletRequestPayload> {
    protected static type = 'WalletRequest';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type LoginRequestPayload
     */
    constructor(vc: WalletRequestVerifiableCredential | VCWithTypeType<WalletRequestPayload>) {
        super(vc);
        this.decodedPayload.requests = this.decodedPayload.requests.map((request) => {
            if (WalletRequest.isLoginRequest(request)) {
                (request as LoginRequestPayload).login.publicKey = PublicKey.from(
                    (request as LoginRequestPayload).login.publicKey
                );
            }

            return request;
        });
    }

    /**
     * Alternative constructor that returns type LoginRequest
     */
    static async signRequest(
        payload: WalletRequestPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<WalletRequestVerifiableCredential> {
        const vc = await super.sign<WalletRequestPayload>(payload, issuer, options);

        return new this(vc);
    }
}

export class WalletResponseVerifiableCredential extends VerifiableCredentialWithType<WalletResponsePayload> {
    protected static type = 'WalletResponse';

    /**
     * @override the VerifiableCredentialWithType constructor to decode the payload of type LoginRequestPayload
     */
    constructor(vc: WalletResponseVerifiableCredential | VCWithTypeType<WalletResponsePayload>) {
        super(vc);

        this.decodedPayload.responses = this.decodedPayload.responses?.map((response) => {
            if ('data' in response && response.data.username) {
                response.data.username = TonomyUsername.fromFullUsername(response.data.username as unknown as string);
            }

            return response;
        });
    }

    /**
     * Alternative constructor that returns type LoginRequest
     */
    static async signResponse(
        payload: WalletResponsePayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<WalletResponseVerifiableCredential> {
        const vc = await super.sign<WalletResponsePayload>(payload, issuer, options);

        return new this(vc);
    }
}

export class WalletRequest implements Serializable {
    vc: WalletRequestVerifiableCredential;
    external?: App;

    constructor(vc: WalletRequestVerifiableCredential | VCWithTypeType<WalletRequestPayload>) {
        this.vc = new WalletRequestVerifiableCredential(vc);
    }

    static isLoginRequest(request: WalletRequestPayloadType): boolean {
        return 'login' in request;
    }

    static isDataSharingRequest(request: WalletRequestPayloadType): boolean {
        return 'data' in request;
    }

    getRequests(): WalletRequestPayloadType[] {
        return this.vc.getPayload().requests;
    }

    getLoginRequest(): LoginRequestPayload {
        const res = this.getRequests().find((request) => WalletRequest.isLoginRequest(request)) as LoginRequestPayload;

        if (!res) {
            throw new Error('No login request found');
        }

        return res;
    }

    getDataSharingRequest(): DataSharingRequestPayload | undefined {
        return this.getRequests().find((request) =>
            WalletRequest.isDataSharingRequest(request)
        ) as DataSharingRequestPayload;
    }

    getOrigin(): string {
        return this.getLoginRequest().login.origin;
    }

    async verify(): Promise<boolean> {
        return await this.vc.verify();
    }

    getDid(): string {
        return this.vc.getIssuer();
    }

    checkReferrerOrigin(): void {
        const referrer = document.referrer;

        if (!referrer) throw new Error('No referrer found');

        const referrerOrigin = new URL(referrer).origin;
        const origin = new URL(this.getOrigin()).origin;

        if (origin !== referrerOrigin) {
            throw new Error(`Referrer origin ${referrerOrigin} does not match login request origin ${origin}`);
        }
    }

    async getApp(): Promise<App> {
        if (this.external) return this.external;

        this.external = await App.getApp(this.getOrigin());
        return this.external;
    }

    async accept(user: IUserRequestsManager): Promise<WalletResponse> {
        const external = await this.getApp();

        const responses: WalletResponsePayloadType[] = [];

        for (const request of this.getRequests()) {
            if (WalletRequest.isLoginRequest(request)) {
                const req = request as LoginRequestPayload;

                try {
                    const appPermission = await verifyKeyExistsForApp(await user.getAccountName(), {
                        publicKey: req.login.publicKey,
                    });
                    const app = await App.getApp(req.login.origin);

                    if (app.accountName.toString() !== appPermission.toString()) {
                        throw new Error(
                            `App ${app.accountName} is not authorized for the key ${req.login.publicKey.toString()}`
                        );
                    }
                } catch (e) {
                    if (e instanceof SdkError && e.code === SdkErrors.UserNotLoggedInWithThisApp) {
                        await user.loginWithApp(external, req.login.publicKey);
                    } else throw e;
                }
            } else if (WalletRequest.isDataSharingRequest(request)) {
                const req = request as DataSharingRequestPayload;

                const res: DataSharingResponsePayload = { data: {} };

                if (req.data.username) {
                    res.data.username = await user.getUsername();
                }

                responses.push(res);
            } else {
                throw new Error('Unknown request type');
            }
        }

        const issuer = await user.getIssuer();

        const vc = await WalletResponseVerifiableCredential.signResponse({ success: true, responses }, issuer);

        return new WalletResponse(vc);
    }

    toJSON(): string {
        return this.toString();
    }
    toString(): string {
        return this.vc.toString();
    }
}

export class DualWalletRequests implements Serializable {
    external: WalletRequest;
    sso?: WalletRequest;

    constructor(external: WalletRequest, sso?: WalletRequest) {
        this.external = external;
        if (sso) this.sso = sso;
    }

    static fromString(str: string): DualWalletRequests {
        const decoded = base64UrlToObj(str);
        let sso: WalletRequest | undefined;
        const external = new WalletRequest(decoded.external);

        if (decoded.sso) {
            sso = new WalletRequest(decoded.sso);
        }

        return new this(external, sso);
    }

    static fromUrl(): DualWalletRequests {
        const params = new URLSearchParams(window.location.search);

        const base64UrlPayload = params.get('payload');

        if (!base64UrlPayload) throw new Error("payload parameter doesn't exist");
        return this.fromString(base64UrlPayload);
    }

    async verify(): Promise<boolean> {
        const externalVerified = await this.external.verify();
        const ssoVerified = this.sso ? await this.sso.verify() : true;

        return externalVerified && ssoVerified;
    }

    async accept(user: IUserRequestsManager): Promise<DualWalletResponse> {
        const externalResponse = await this.external.accept(user);
        let ssoResponse: WalletResponse | undefined;

        if (this.sso) {
            ssoResponse = await this.sso.accept(user);
        }

        return DualWalletResponse.fromResponses(externalResponse, ssoResponse);
    }
    async reject(error: WalletResponseError): Promise<DualWalletResponse> {
        return DualWalletResponse.fromError(error, this);
    }

    toJSON(): string {
        return this.toString();
    }

    toString(): string {
        const obj = this.sso ? { external: this.external, sso: this.sso } : { external: this.external };

        return objToBase64Url(obj);
    }
}

export class WalletResponse implements Serializable {
    vc: WalletResponseVerifiableCredential;

    constructor(vc: WalletResponseVerifiableCredential | VCWithTypeType<WalletResponsePayload>) {
        this.vc = new WalletResponseVerifiableCredential(vc);
    }

    getResponses(): WalletResponsePayloadType[] | undefined {
        return this.vc.getPayload().responses;
    }

    getLoginResponse(): LoginRequestResponsePayload {
        const res = this.getResponses()?.find((response) => 'login' in response) as LoginRequestResponsePayload;

        if (!res) throw new Error('No login response found');
        return res;
    }

    getDataSharingResponse(): DataSharingResponsePayload | undefined {
        return this.getResponses()?.find((response) => 'data' in response) as DataSharingResponsePayload;
    }

    getAccountName(): Name {
        return getAccountNameFromDid(this.vc.getIssuer());
    }

    toJSON(): string {
        return this.toString();
    }
    toString(): string {
        return this.vc.toString();
    }
}

export class DualWalletResponse implements Serializable {
    success: boolean;
    external?: WalletResponse;
    sso?: WalletResponse;
    error?: WalletResponseError;
    requests?: DualWalletRequests;

    constructor(
        success: boolean,
        {
            external,
            sso,
            error,
            requests,
        }: {
            external?: WalletResponse;
            sso?: WalletResponse;
            error?: WalletResponseError;
            requests?: DualWalletRequests;
        }
    ) {
        if (success) {
            if (!external) throw new Error('External wallet response is required for a successful response');
            this.success = true;
            this.external = external;
            if (sso) this.sso = sso;
        } else {
            if (!error) throw new Error('Error is required for an unsuccessful response');
            if (!requests) throw new Error('Requests are required for an unsuccessful response');
            this.success = false;
            this.error = error;
            this.requests = requests;
        }
    }

    static fromResponses(external: WalletResponse, sso?: WalletResponse): DualWalletResponse {
        return new this(true, { external, sso });
    }
    static fromError(error: WalletResponseError, requests: DualWalletRequests): DualWalletResponse {
        return new this(false, { error, requests });
    }

    static fromString(str: string): DualWalletResponse {
        const decoded = base64UrlToObj(str);

        if (decoded.success) {
            return this.fromResponses(
                new WalletResponse(decoded.external),
                decoded.sso ? new WalletResponse(decoded.sso) : undefined
            );
        } else {
            const error: WalletResponseError = {
                code: decoded.error.code,
                reason: decoded.error.reason,
            };
            const requests = DualWalletRequests.fromString(decoded.requests);

            return this.fromError(error, requests);
        }
    }

    static fromUrl(): DualWalletResponse {
        const params = new URLSearchParams(window.location.search);

        const base64UrlPayload = params.get('payload');

        if (!base64UrlPayload) throw new Error("payload parameter doesn't exist");
        return this.fromString(base64UrlPayload);
    }

    isSuccess(): boolean {
        return this.success;
    }

    async verify(): Promise<boolean> {
        if (!this.success) throw new Error('Cannot verify a failed response');
        const externalVerified = this.external ? await this.external.vc.verify() : true;
        const ssoVerified = this.sso ? await this.sso.vc.verify() : true;

        return externalVerified && ssoVerified;
    }

    toJSON(): string {
        return this.toString();
    }

    toString(): string {
        const obj = this.sso ? { external: this.external, sso: this.sso } : { external: this.external };

        return objToBase64Url(obj);
    }
}

// export class DualWalletResponseError implements Serializable {
//     success: boolean;
//     error: WalletResponseError;
//     requests: DualWalletRequests;

//     constructor(error: WalletResponseError, requests: DualWalletRequests) {
//         this.success = false;
//         this.error = error;
//         this.requests = requests;
//     }
//     fromString(str: string): DualWalletResponseError {
//         const decoded = base64UrlToObj(str);
//         const requests = DualWalletRequests.fromString(decoded.requests);
//         const error: WalletResponseError = {
//             code: decoded.error.code,
//             reason: decoded.error.reason,
//         };

//         return new DualWalletResponseError(error, requests);
//     }
//     toJSON(): string {
//         return this.toString();
//     }
//     toString(): string {
//         return objToBase64Url(this);
//     }
// }

// export function isWalletResponseSuccess(str: string): boolean {
//     const response = base64UrlToObj(str);

//     return response.success;
// }
