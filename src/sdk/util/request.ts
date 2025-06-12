import { Name, PublicKey } from '@wharfkit/antelope';
import { VCWithTypeType, VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { Issuer } from 'did-jwt-vc';
import { App } from '../controllers/App';
import { IUserRequestsManager } from '../types/User';
import { isErrorCode, SdkErrors } from './errors';
import { Serializable } from './serializable';
import { base64UrlToObj, objToBase64Url } from './base64';
import { TonomyUsername } from './username';
import { verifyKeyExistsForApp } from '../helpers/user';
import { getAccountNameFromDid } from './ssi/did';
import Debug from 'debug';
import { getSettings } from './settings';
import { isSameOrigin } from '../helpers/urls';

const debug = Debug('tonomy-sdk:util:WalletRequest');

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
    kyc?: boolean;
    // verified: {
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
        kyc?: {
            verified: boolean;
            firstName: string;
            lastName: string;
            dateOfBirth: string;
            nationality: string;
            documentType: string;
            documentNumber: string;
            verificationDate: string;
        };
        // verified?: {
        //     firstName?: string;
        //     lastName?: string;
        //     address?: string;
        //     birthDate?: string;
        // };
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
            if (WalletResponse.isDataSharingResponse(response)) {
                const data = (response as DataSharingResponsePayload).data;

                if (data.username && !(data.username instanceof TonomyUsername)) {
                    data.username = TonomyUsername.fromFullUsername(data.username as unknown as string);
                }
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
    app?: App;

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

        if (!isSameOrigin(referrer, this.getOrigin())) {
            throw new Error(`Referrer origin ${referrer} does not match login request origin ${this.getOrigin()}`);
        }
    }

    async getApp(): Promise<App> {
        if (this.app) return this.app;

        this.app = await App.getApp(this.getOrigin());
        return this.app;
    }

    /**
     * Accepts the wallet request and returns a WalletResponse.
     *
     * @param {IUserRequestsManager} user - The user manager to handle the request.
     * @param {boolean} [checkSsoDomain=false] - Whether to check the SSO domain for login requests.
     * @returns {Promise<WalletResponse>} - The wallet response containing the accepted requests.
     */
    async accept(user: IUserRequestsManager, checkSsoDomain = false): Promise<WalletResponse> {
        const external = await this.getApp();

        debug(`WalletRequest/accept: Accepting request from app ${external.origin}`);

        const responses: WalletResponsePayloadType[] = [];

        for (const request of this.getRequests()) {
            if (WalletRequest.isLoginRequest(request)) {
                const req = request as LoginRequestPayload;

                debug(`WalletRequest/accept: Accepting request from app ${external.origin}: login request`);

                if (checkSsoDomain) {
                    if (!isSameOrigin(req.login.origin, getSettings().ssoWebsiteOrigin))
                        throw new Error(
                            `Invalid origin for SSO login request. Received ${req.login.origin}, expected ${getSettings().accountsServiceUrl}`
                        );
                }

                const app = await App.getApp(req.login.origin);

                try {
                    const appPermission = await verifyKeyExistsForApp(await user.getAccountName(), {
                        publicKey: req.login.publicKey,
                    });

                    if (app.accountName.toString() !== appPermission.toString()) {
                        throw new Error(
                            `App ${app.accountName} is not authorized for the key ${req.login.publicKey.toString()}`
                        );
                    }
                } catch (e) {
                    if (isErrorCode(e, SdkErrors.UserNotLoggedInWithThisApp)) {
                        debug(
                            `WalletRequest/accept: Accepting request from app ${external.origin}: calling loginWithApp()`
                        );
                        await user.loginWithApp(external, req.login.publicKey);
                    } else throw e;
                }

                responses.push({
                    login: {
                        origin: req.login.origin,
                        callbackPath: req.login.callbackPath,
                    },
                });
            } else if (WalletRequest.isDataSharingRequest(request)) {
                const req = request as DataSharingRequestPayload;

                const res: DataSharingResponsePayload = { data: {} };

                if (req.data.username) {
                    res.data.username = await user.getUsername();
                }
                
                if (req.data.kyc) {
                    // Retrieve KYC data from user's storage if available
                    // try {
                    //     const kycDataStr = await user.storage.getItem('kyc_verification_data');
                    //     if (kycDataStr) {
                    //         res.data.kyc = JSON.parse(kycDataStr);
                    //         debug(`WalletRequest/accept: Including KYC data in response`);
                    //     } else {
                    //         debug(`WalletRequest/accept: KYC data requested but not found in storage`);
                    //     }
                    // } catch (error) {
                    //     debug(`WalletRequest/accept: Error retrieving KYC data: ${error}`);
                    // }
                }

                debug(
                    `WalletRequest/accept: Accepting request from app ${external.origin}: data sharing request ${JSON.stringify(res.data, null, 2)}`
                );

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

        debug('DualWalletRequests/fromString: Decoded requests', decoded);
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
        debug('DualWalletRequests/accept: Accepting requests', typeof this.external, typeof this.sso);
        const externalResponse = await this.external.accept(user);
        let ssoResponse: WalletResponse | undefined;

        if (this.sso) {
            ssoResponse = await this.sso.accept(user, true);
        }

        return DualWalletResponse.fromResponses(externalResponse, ssoResponse);
    }
    async reject(error: WalletResponseError): Promise<DualWalletResponse> {
        debug('DualWalletRequests/reject: Rejecting requests with error', error, typeof this.external, typeof this.sso);
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

    static isLoginResponse(response: WalletResponsePayloadType): boolean {
        return 'login' in response;
    }
    static isDataSharingResponse(response: WalletResponsePayloadType): boolean {
        return 'data' in response;
    }

    getLoginResponse(): LoginRequestResponsePayload {
        const res = this.getResponses()?.find((r) => WalletResponse.isLoginResponse(r)) as LoginRequestResponsePayload;

        if (!res) throw new Error('No login response found');
        return res;
    }

    getDataSharingResponse(): DataSharingResponsePayload | undefined {
        return this.getResponses()?.find((r) => WalletResponse.isDataSharingResponse(r)) as DataSharingResponsePayload;
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

        debug('DualWalletResponse/fromString: Decoded response', decoded);

        if (decoded.success) {
            return this.fromResponses(
                new WalletResponse(decoded.external),
                decoded.sso ? new WalletResponse(decoded.sso) : undefined
            );
        } else {
            const error: WalletResponseError = decoded.error;
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
        const obj = {
            success: this.success,
            external: this.external,
            sso: this.sso,
            error: this.error,
            requests: this.requests,
        };

        return objToBase64Url(obj);
    }

    getRedirectUrl(external = true): string {
        if (this.isSuccess()) {
            const response = external ? this.external : this.sso;

            if (!response) throw new Error('response not found in getRedirectUrl');

            return (
                response.getLoginResponse().login.origin +
                response.getLoginResponse().login.callbackPath +
                '?payload=' +
                this.toString()
            );
        } else {
            if (!this.requests) throw new Error('requests not found in getRedirectUrl');
            const request = external ? this.requests.external : this.requests.sso;

            if (!request) throw new Error('request not found in getRedirectUrl');

            return (
                request.getLoginRequest().login.origin +
                request.getLoginRequest().login.callbackPath +
                '?payload=' +
                this.toString()
            );
        }
    }
}
