/* eslint-disable camelcase */
import { SdkErrors, throwError } from '../util/errors';
import { LoginRequest, TonomyRequest } from '../util/request';
import { DataSharingRequest } from '../util';

/**
 * Verifies the TonomyRequests are valid requests signed by valid DIDs
 *
 * @param {TonomyRequest[]} requests - an array of TonomyRequests (LoginRequest or DataSharingRequest)
 */
export async function verifyRequests(requests: TonomyRequest[]): Promise<void> {
    if (requests.find((request) => request === null))
        throwError('Request array contains null value', SdkErrors.InvalidRequestType);

    for (const request of requests) {
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

    return requests;
}
