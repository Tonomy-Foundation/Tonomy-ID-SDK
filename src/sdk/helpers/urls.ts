/* eslint-disable camelcase */
import { SdkErrors, throwError } from '../util/errors';
import { WalletRequest } from '../util/request';
import { LoginRequestsMessagePayload } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { base64UrlToObj } from '../util/base64';
import { RequestsManager } from './requestsManager';
import { WalletRequestAndResponse, WalletRequestAndResponseObject } from './responsesManager';

/**
 * Extracts the WalletRequests from the URL
 *
 * @returns {LoginRequestsMessagePayload} the requests, username and accountName
 */
export function getLoginRequestFromUrl(): LoginRequestsMessagePayload {
    const params = new URLSearchParams(window.location.search);

    const base64UrlPayload = params.get('payload');

    if (!base64UrlPayload) throwError("payload parameter doesn't exist", SdkErrors.MissingParams);

    const unparsedLoginRequestMessagePayload = base64UrlToObj(base64UrlPayload);
    const requests = new RequestsManager(unparsedLoginRequestMessagePayload.requests);

    return { requests: requests.getRequests() };
}

/**
 * Extracts the login requests, username and accountName from the URL
 *
 * @returns {LoginRequestResponseMessagePayload} the requests, username and accountName
 */
export function getLoginRequestResponseFromUrl(): LoginRequestResponseMessagePayload {
    const params = new URLSearchParams(window.location.search);

    const base64UrlPayload = params.get('payload');

    if (!base64UrlPayload) throwError("payload parameter doesn't exists", SdkErrors.MissingParams);

    const parsedPayload = base64UrlToObj(base64UrlPayload);

    if (parsedPayload.success !== true && parsedPayload.success !== false)
        throwError("success parameter doesn't exists", SdkErrors.MissingParams);

    if (parsedPayload.success) {
        if (!parsedPayload.response) {
            throw new Error('LoginRequestsResponseMessage must have a responses property');
        }

        const responses: WalletRequestAndResponse[] = parsedPayload.response.map((response: string) =>
            new WalletRequestAndResponseObject(response).getRequestAndResponse()
        );

        return {
            ...parsedPayload,
            response: responses,
        };
    } else {
        if (!parsedPayload.error) {
            throw new Error('LoginRequestsResponseMessage must have an error property');
        }

        const error = parsedPayload.error;
        const requests = error.requests.map((request: string) => new WalletRequest(request));
        const requestsManager = new RequestsManager(requests);

        return {
            ...parsedPayload,
            error: {
                ...error,
                requests: requestsManager.getRequests(),
            },
        };
    }
}

/**
 * Verifies the WalletRequests received in the URL were successfully authorized by Tonomy ID
 *
 * @description should be called in the callback page of the Tonomy Accounts (SSO) website
 *
 * @returns {Promise<WalletRequest[]>} - the verified WalletRequests
 */
export async function onRedirectLogin(): Promise<WalletRequest[]> {
    const { requests } = getLoginRequestFromUrl();

    const requestsManager = new RequestsManager(requests);

    await requestsManager.verify();
    await requestsManager.checkReferrerOrigin();

    return requestsManager.getRequests();
}
