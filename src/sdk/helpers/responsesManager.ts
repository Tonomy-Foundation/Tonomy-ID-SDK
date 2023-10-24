import { App } from '../controllers/app';
import { User } from '../controllers/user';
import {
    DataSharingRequest,
    LoginRequest,
    SdkError,
    SdkErrors,
    Serializable,
    WalletRequest,
    getSettings,
    throwError,
} from '../util';
import {
    DataRequestResponse,
    DataSharingRequestResponseData,
    LoginRequestResponse,
    WalletRequestResponse,
} from '../util/response';
import { RequestsManager, castToWalletRequestSubclass } from './requestsManager';
import { UserApps } from './userApps';

type WalletResponseMeta = {
    app: App;
    requiresLogin?: boolean;
};

export class WalletRequestAndResponseObject implements Serializable {
    request: WalletRequest;
    meta?: WalletResponseMeta;
    response?: WalletRequestResponse;

    constructor(arg: string | WalletRequest | WalletRequestAndResponse) {
        if (typeof arg === 'string') {
            const parsed = JSON.parse(arg);
            const request = new WalletRequest(parsed.request);
            const response = new WalletRequestResponse(parsed.response);

            this.setRequest(castToWalletRequestSubclass(request));
            this.setResponse(castToWalletRequestResponseSubclass(response));
        } else if (arg instanceof WalletRequestAndResponse) {
            this.setRequest(arg.request);
            this.setResponse(arg.response);
        } else if (arg instanceof WalletRequest) {
            this.setRequest(arg);
        } else {
            throwError('Invalid argument type', SdkErrors.InvalidArgumentType);
        }
    }

    setRequest(request: WalletRequest) {
        this.request = request;
    }

    setMeta(meta: { app: App }) {
        this.meta = meta;
    }

    setResponse(response: WalletRequestResponse) {
        this.response = response;
    }

    getRequestType() {
        return this.request.getType();
    }

    getRequest() {
        return this.request;
    }

    getMeta(): WalletResponseMeta {
        if (!this.meta) {
            throwError('Response meta not set', SdkErrors.ResponsesNotFound);
        }

        return this.meta;
    }

    getApp() {
        return this.getMeta().app;
    }

    getResponse(): WalletRequestResponse {
        if (!this.response) {
            throwError('Response not set', SdkErrors.ResponsesNotFound);
        }

        return this.response;
    }

    getRequestAndResponse(): WalletRequestAndResponse {
        return { request: this.getRequest(), response: this.getResponse() };
    }

    toString(): string {
        return JSON.stringify(this.getRequestAndResponse());
    }

    toJSON(): string {
        return this.toString();
    }
}

export class WalletRequestAndResponse {
    request: WalletRequest;
    response: WalletRequestResponse;
}

export class ResponsesManager {
    responses: WalletRequestAndResponseObject[] = [];

    constructor(args: RequestsManager | WalletRequestAndResponse[]) {
        if (args instanceof RequestsManager) {
            this.fromRequestsManager(args);
        } else {
            this.responses = args.map((response) => new WalletRequestAndResponseObject(response));
        }
    }

    fromRequestsManager(requestsManager: RequestsManager): void {
        requestsManager.getRequests().forEach((request) => {
            this.responses.push(new WalletRequestAndResponseObject(request));
        });
    }

    async fetchMeta(user: User): Promise<void> {
        // fetch apps for all requests
        await Promise.all(
            this.responses.map(async (response) => {
                const meta: WalletResponseMeta = {
                    app: await App.getApp(response.getRequest().getPayload().origin),
                };

                // Check if user is logged in with this app (LoginRequest only)
                if (response.getRequest() instanceof LoginRequest) {
                    let requiresLogin = true;

                    try {
                        await UserApps.verifyKeyExistsForApp(await user.getAccountName(), {
                            publicKey: response.getRequest().getPayload().publicKey,
                        });
                        // User already logged in with this key
                        requiresLogin = false;
                    } catch (e) {
                        if (e instanceof SdkError && e.code === SdkErrors.UserNotLoggedInWithThisApp) {
                            // Never consented
                            requiresLogin = true;
                        } else {
                            throw e;
                        }
                    }

                    meta.requiresLogin = requiresLogin;
                }

                response.setMeta(meta);
            })
        );

        // check that all requests from the same issuers have the same apps
        const issuers = this.responses.map((response) => response.getRequest().getPayload().issuer);

        for (const issuer of issuers) {
            const apps = this.responses
                .filter((response) => response.getRequest().getPayload().issuer === issuer)
                .map((response) => response.getApp());

            if (apps.some((app) => !app.accountName.equals(apps[0].accountName))) {
                throw new Error(
                    `Requests with the same issuer have different apps, which can happen if origins change`
                );
            }
        }
    }

    async createResponses(user: User): Promise<WalletRequestAndResponse[]> {
        const issuer = await user.getIssuer();

        for (const response of this.responses) {
            const request = response.getRequest();

            if (request instanceof LoginRequest) {
                if (response.getMeta().requiresLogin === true) {
                    await user.apps.loginWithApp(response.getApp(), request.getPayload().publicKey);
                }

                response.setResponse(
                    await LoginRequestResponse.signResponse({ accountName: await user.getAccountName() }, issuer)
                );
            } else if (request instanceof DataSharingRequest) {
                const data: DataSharingRequestResponseData = {};

                if (request.getPayload().username) {
                    data.username = await user.getUsername();
                }

                response.setResponse(await DataRequestResponse.signResponse({ data }, issuer));
            }
        }

        return this.exportFinalResponses();
    }

    async verify(): Promise<void> {
        await Promise.all(
            this.responses.map(async (response) => {
                return await Promise.all([response.getRequest().verify(), response.getResponse().verify()]);
            })
        );
    }

    exportFinalResponses(): WalletRequestAndResponse[] {
        return this.responses.map((response) => response.getRequestAndResponse());
    }

    getResponsesWithSameOriginOrThrow(): WalletRequestAndResponseObject[] {
        const responses = this.responses.filter((response) => response.getApp().origin === window.location.origin);

        if (responses.length === 0) {
            throwError('No external app requests found', SdkErrors.ResponsesNotFound);
        }

        return responses;
    }

    getLoginResponsesWithSameOriginOrThrow(): WalletRequestAndResponseObject {
        const response = this.getResponsesWithSameOriginOrThrow().find(
            (response) => response.getRequest() instanceof LoginRequest
        );

        if (!response) {
            throwError('No external login request found', SdkErrors.ResponsesNotFound);
        }

        return response;
    }

    getLoginResponseWithDifferentOriginOrThrow(): WalletRequestAndResponseObject {
        const response = this.getResponsesWithDifferentOrigin().find(
            (response) => response.getRequest() instanceof LoginRequest
        );

        if (!response) {
            throwError('No external login request found', SdkErrors.ResponsesNotFound);
        }

        return response;
    }

    getDataSharingResponseWithSameOrigin(): WalletRequestAndResponseObject | undefined {
        return this.getResponsesWithSameOriginOrThrow().find(
            (response) => response.getRequest() instanceof DataSharingRequest
        );
    }

    getRequests(): WalletRequest[] {
        return this.responses.map((response) => response.getRequest());
    }

    getResponsesWithDifferentOrigin(): WalletRequestAndResponseObject[] {
        return this.responses.filter((response) => response.getApp().origin !== window.location.origin);
    }

    getExternalAppRequestsIssuerOrThrow(): string {
        const externalLoginResponse = this.responses.find(
            (response) => (response.getRequest().getPayload().origin = getSettings().ssoWebsiteOrigin)
        );

        if (!externalLoginResponse) throwError('No external login request found', SdkErrors.ResponsesNotFound);
        return externalLoginResponse.getRequest().getPayload().issuer;
    }
}

export function castToWalletRequestResponseSubclass(response: WalletRequestResponse): WalletRequestResponse {
    if (response.getType() === LoginRequestResponse.getType()) {
        return new LoginRequestResponse(response);
    } else if (response.getType() === DataRequestResponse.getType()) {
        return new DataRequestResponse(response);
    } else {
        throwError('Invalid WalletRequestResponse Type', SdkErrors.InvalidRequestResponseType);
    }
}
