/* eslint-disable camelcase */
import { SdkErrors, throwError } from '../util/errors';
import { LoginRequest, WalletRequest } from '../util/request';
import { DataSharingRequest } from '../util';

export class RequestsManager {
    requests: WalletRequest[] = [];

    constructor(requests: WalletRequest[] | string[]) {
        if (typeof requests[0] === 'string') {
            this.fromStrings(requests as string[]);
        } else {
            this.from(requests as WalletRequest[]);
        }
    }

    from(requests: WalletRequest[]): void {
        const checkedRequests = this.checkArrayAndFilterNull<WalletRequest>(requests);

        const classInitializedRequests: WalletRequest[] = [];

        for (const request of checkedRequests) {
            if (request.getType() === LoginRequest.getType()) {
                classInitializedRequests.push(new LoginRequest(request));
            } else if (request.getType() === DataSharingRequest.getType()) {
                classInitializedRequests.push(new DataSharingRequest(request));
            } else {
                throwError('Invalid WalletRequest Type', SdkErrors.InvalidRequestType);
            }
        }

        this.requests = classInitializedRequests;
    }

    fromStrings(requests: string[]): void {
        const checkedRequests = this.checkArrayAndFilterNull<string>(requests);

        this.from(checkedRequests.map((request) => new WalletRequest(request)));
    }

    checkArrayAndFilterNull<T>(array: T[]): T[] {
        if (!array || !Array.isArray(array)) {
            throwError('No requests found', SdkErrors.RequestsNotFound);
        }

        const response = array.filter((request) => request !== null);

        if (response.length === 0) {
            throwError('No requests found in array', SdkErrors.RequestsNotFound);
        }

        return response;
    }

    getRequests(): WalletRequest[] {
        return this.requests;
    }

    /**
     * Verifies the WalletRequests are valid requests signed by valid DIDs
     * @throws if the requests are not valid
     */
    async verify(): Promise<void> {
        for (const request of this.requests) {
            if (!(await request.verify())) {
                if (request.getType() === LoginRequest.getType()) {
                    throwError(
                        `Invalid request for ${request.getType()} ${request.getPayload().origin}`,
                        SdkErrors.JwtNotValid
                    );
                } else if (request.getType() === DataSharingRequest.getType()) {
                    throwError(`Invalid request for ${request.getType()} `, SdkErrors.JwtNotValid);
                }
            }
        }
    }

    checkReferrerOrigin(): void {
        const docReferrer = document.referrer;

        if (!docReferrer) throwError('No referrer found', SdkErrors.ReferrerEmpty);

        const referrerOrigin = new URL(docReferrer).origin;

        const myRequest = this.getLoginRequestsOrThrow().find(
            (request) => request.getPayload().origin === referrerOrigin
        );

        if (!myRequest) {
            const msg =
                `No origins from: ${this.getLoginRequestsOrThrow().map((r) => r.getPayload().origin)} ` +
                `match referrer: ${referrerOrigin}`;

            throwError(msg, SdkErrors.WrongOrigin);
        }
    }

    getLoginRequests(): LoginRequest[] | undefined {
        const response = this.requests.filter((request) => request instanceof LoginRequest);

        return response.length > 0 ? response : undefined;
    }

    getLoginRequestsOrThrow(): LoginRequest[] {
        const response = this.getLoginRequests();

        if (!response) {
            throwError('No LoginRequests found', SdkErrors.RequestsNotFound);
        }

        return response;
    }

    getDataSharingRequests(): DataSharingRequest[] | undefined {
        const response = this.requests.filter((request) => request instanceof DataSharingRequest);

        return response.length > 0 ? response : undefined;
    }

    getDataSharingRequestsOrThrow(): DataSharingRequest[] {
        const response = this.getDataSharingRequests();

        if (!response) {
            throwError('No DataSharingRequests found', SdkErrors.RequestsNotFound);
        }

        return response;
    }

    getLoginRequestWithSameOriginOrThrow(): LoginRequest {
        const myOrigin = window.location.origin;
        const response = this.getLoginRequestsOrThrow().find((request) => request.getPayload().origin === myOrigin);

        if (!response) {
            throwError(`No origin from ${myOrigin} found`, SdkErrors.OriginNotFound);
        }

        return response;
    }

    getLoginRequestWithDifferentOriginOrThrow(): LoginRequest {
        const myOrigin = window.location.origin;
        const response = this.getLoginRequestsOrThrow().find((request) => request.getPayload().origin !== myOrigin);

        if (!response) {
            throwError(`No origin different from ${myOrigin} found`, SdkErrors.OriginNotFound);
        }

        return response;
    }

    getRequestsSameOriginOrThrow(): WalletRequest[] {
        const loginRequest = this.getLoginRequestWithSameOriginOrThrow();
        const issuer = loginRequest.getIssuer();

        // TODO should maybe add origin to the DataRequest object instead of using the issuer?
        const dataSharingRequest = this.requests.find(
            (request) => request instanceof DataSharingRequest && request.getIssuer() === issuer
        );

        if (dataSharingRequest) {
            return [loginRequest, dataSharingRequest];
        } else {
            return [loginRequest];
        }
    }

    getRequestsDifferentOriginOrThrow(): WalletRequest[] {
        const loginRequest = this.getLoginRequestWithDifferentOriginOrThrow();
        const issuer = loginRequest.getIssuer();

        // TODO should maybe add origin to the DataRequest object instead of using the issuer?
        const dataSharingRequest = this.requests.find(
            (request) => request instanceof DataSharingRequest && request.getIssuer() === issuer
        );

        if (dataSharingRequest) {
            return [loginRequest, dataSharingRequest];
        } else {
            return [loginRequest];
        }
    }
}
