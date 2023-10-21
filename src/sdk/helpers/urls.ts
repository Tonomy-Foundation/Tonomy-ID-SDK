/* eslint-disable camelcase */
import { Name } from '@wharfkit/antelope';
import { SdkErrors, throwError } from '../util/errors';
import { TonomyUsername } from '../util/username';
import { LoginRequest, TonomyRequest } from '../util/request';
import { LoginRequestsMessagePayload, LoginResponse } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { base64UrlToObj } from '../util/base64';
import { DataSharingRequest } from '../util';
import { RequestManager, verifyRequests } from './requests';

/**
 * Extracts the TonomyRequests from the URL
 *
 * @returns {LoginRequestsMessagePayload} the requests, username and accountName
 */
export function getLoginRequestFromUrl(): LoginRequestsMessagePayload {
    const params = new URLSearchParams(window.location.search);

    const base64UrlPayload = params.get('payload');

    if (!base64UrlPayload) throwError("payload parameter doesn't exist", SdkErrors.MissingParams);

    // get unparsed LoginRequestsMessagePayload object
    const unparsedLoginRequestMessagePayload = base64UrlToObj(base64UrlPayload);

    if (!unparsedLoginRequestMessagePayload.requests)
        throwError('No requests found in payload', SdkErrors.MissingParams);

    const unparsedRequestStrings = unparsedLoginRequestMessagePayload.requests.filter(
        (request: string) => request !== null
    );

    if (!unparsedRequestStrings) throwError('No requests found in payload', SdkErrors.MissingParams);

    const requests = unparsedRequestStrings.map((request: string) => {
        const tonomyRequest = new TonomyRequest(request);

        if (tonomyRequest.getType() === LoginRequest.getType()) {
            return new LoginRequest(tonomyRequest);
        } else if (tonomyRequest.getType() === DataSharingRequest.getType()) {
            return new DataSharingRequest(tonomyRequest);
        } else {
            throwError('Invalid TonomyRequest Type', SdkErrors.InvalidRequestType);
        }
    });

    return { requests };
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

    const { requests } = getLoginRequestFromUrl();

    if (parsedPayload.success) {
        if (!parsedPayload.response?.accountName)
            throwError("accountName parameter doesn't exists", SdkErrors.MissingParams);
        const response: LoginResponse = {
            accountName: Name.from(parsedPayload.response.accountName),
        };

        if (parsedPayload.response.data?.username) {
            response.data = {
                username: new TonomyUsername(parsedPayload.response.data.username),
            };
        }

        return {
            success: true,
            requests,
            response,
        };
    } else {
        if (!parsedPayload.error) throwError("error parameter doesn't exists", SdkErrors.MissingParams);
        return { success: false, requests, error: parsedPayload.error };
    }
}

/**
 * Verifies the TonomyRequests received in the URL were successfully authorized by Tonomy ID
 *
 * @description should be called in the callback page of the Tonomy Accounts (SSO) website
 *
 * @returns {Promise<TonomyRequest[]>} - the verified TonomyRequests
 */
export async function onRedirectLogin(): Promise<TonomyRequest[]> {
    const { requests } = getLoginRequestFromUrl();

    const requestsManager = new RequestManager(requests);

    await requestsManager.verify();
    await requestsManager.checkReferrerOrigin();

    return requests;
}
