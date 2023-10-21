/* eslint-disable camelcase */
import { SdkErrors, throwError } from '../util/errors';
import { LoginRequest, TonomyRequest } from '../util/request';
import { DataSharingRequest } from '../util';

export class RequestManager {
    requests: TonomyRequest[] = [];

    constructor(requests: TonomyRequest[] | string[]) {
        if (typeof requests[0] === 'string') {
            this.fromStrings(requests as string[]);
        } else {
            this.from(requests as TonomyRequest[]);
        }
    }

    from(requests: TonomyRequest[]): void {
        const checkedRequests = this.checkArrayAndFilterNull<TonomyRequest>(requests);

        const classInitializedRequests: TonomyRequest[] = [];

        for (const request of checkedRequests) {
            if (request.getType() === LoginRequest.getType()) {
                classInitializedRequests.push(new LoginRequest(request));
            } else if (request.getType() === DataSharingRequest.getType()) {
                classInitializedRequests.push(new DataSharingRequest(request));
            } else {
                throwError('Invalid TonomyRequest Type', SdkErrors.InvalidRequestType);
            }
        }

        this.requests = classInitializedRequests;
    }

    fromStrings(requests: string[]): void {
        const checkedRequests = this.checkArrayAndFilterNull<string>(requests);

        this.from(checkedRequests.map((request) => new TonomyRequest(request)));
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

    getRequests(): TonomyRequest[] {
        return this.requests;
    }

    /**
     * Verifies the TonomyRequests are valid requests signed by valid DIDs
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

    getRequestsWithSameOriginOrThrow(): TonomyRequest[] {
        const myOrigin = window.location.origin;
        const response = this.getLoginRequestsOrThrow().filter((request) => request.getPayload().origin === myOrigin);

        if (!response || response.length === 0) {
            throwError(`No origin from ${myOrigin} found`, SdkErrors.OriginNotFound);
        }

        return response;
    }
}
