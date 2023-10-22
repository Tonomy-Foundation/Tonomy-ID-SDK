import { App } from '../controllers/app';
import { User } from '../controllers/user';
import { DataSharingRequest, LoginRequest, TonomyRequest } from '../util';
import {
    DataRequestResponse,
    DataSharingRequestResponseData,
    LoginRequestResponse,
    TonomyRequestResponse,
} from '../util/response';
import { RequestsManager } from './requestsManager';

export class TonomyResponseObject {
    request: TonomyRequest;
    meta: {
        app: App;
    };
    response: TonomyRequestResponse;

    constructor(request: TonomyRequest) {
        this.request = request;
    }

    getRequestType() {
        return this.request.getType();
    }
}

export class ResponseManager {
    responses: TonomyResponseObject[] = [];

    constructor(requestsManager: RequestsManager) {
        requestsManager.getRequests().forEach((request) => {
            this.responses.push(new TonomyResponseObject(request));
        });
    }

    async fetchMeta() {
        // fetch apps for all requests
        await Promise.all(
            this.responses.map(async (response) => {
                response.meta = {
                    app: await App.getApp(response.request.getPayload().origin),
                };
            })
        );

        // check that all requests from the same issuers have the same apps
        const issuers = this.responses.map((response) => response.request.getPayload().issuer);

        for (const issuer of issuers) {
            const apps = this.responses
                .filter((response) => response.request.getPayload().issuer === issuer)
                .map((response) => response.meta.app);

            if (apps.some((app) => !app.accountName.equals(apps[0].accountName))) {
                throw new Error(
                    `Requests with the same issuer have different apps, which can happen if origins change`
                );
            }
        }
    }

    async createResponses(user: User) {
        for (const response of this.responses) {
            const request = response.request;

            if (request instanceof LoginRequest) {
                response.response = new LoginRequestResponse(await user.getAccountName());
            } else if (request instanceof DataSharingRequest) {
                const data: DataSharingRequestResponseData = {};

                if (request.getPayload().username) {
                    data.username = await user.getUsername();
                }

                response.response = new DataRequestResponse(data);
            }
        }
    }
}
