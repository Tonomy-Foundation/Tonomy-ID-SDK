import { Name } from '@wharfkit/antelope';
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

    constructor(arg: string | WalletRequest | WalletRequestAndResponse | WalletRequestAndResponseStrings) {
        if (typeof arg === 'string') {
            const parsed = JSON.parse(arg);
            const request = new WalletRequest(parsed.request);
            const response = new WalletRequestResponse(parsed.response);

            this.setRequest(castToWalletRequestSubclass(request));
            this.setResponse(castToWalletRequestResponseSubclass(response));
        } else if (arg instanceof WalletRequestAndResponse) {
            this.setRequest(castToWalletRequestSubclass(arg.request));
            this.setResponse(castToWalletRequestResponseSubclass(arg.response));
        } else if (WalletRequestAndResponse.isInstance(arg)) {
            this.setRequest(castToWalletRequestSubclass((arg as unknown as WalletRequestAndResponse).request));
            this.setResponse(
                castToWalletRequestResponseSubclass((arg as unknown as WalletRequestAndResponse).response)
            );
        } else if (arg instanceof WalletRequest) {
            this.setRequest(castToWalletRequestSubclass(arg));
        } else if (WalletRequestAndResponseStrings.isInstance(arg)) {
            this.setRequest(castToWalletRequestSubclass(new WalletRequest(arg.request)));
            this.setResponse(castToWalletRequestResponseSubclass(new WalletRequestResponse(arg.response)));
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

    getMetaOrThrow(): WalletResponseMeta {
        if (!this.meta) {
            throwError('Response meta not set', SdkErrors.ResponsesNotFound);
        }

        return this.meta;
    }

    getAppOrThrow() {
        return this.getMetaOrThrow().app;
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

    static isInstance(arg: any): boolean {
        return (
            arg instanceof Object &&
            arg.request &&
            arg.request instanceof WalletRequest &&
            arg.response &&
            arg.response instanceof WalletRequestResponse
        );
    }
}

export class WalletRequestAndResponseStrings {
    request: string;
    response: string;

    static isInstance(arg: any): boolean {
        return (
            arg instanceof Object &&
            arg.request &&
            typeof arg.request === 'string' &&
            arg.response &&
            typeof arg.response === 'string'
        );
    }
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

    async fetchMeta(options?: { accountName?: Name }): Promise<void> {
        // fetch apps for all requests
        await Promise.all(
            this.responses.map(async (response) => {
                const meta: WalletResponseMeta = {
                    app: await App.getApp(response.getRequest().getPayload().origin),
                };

                // Check if user is logged in with this app (LoginRequest only)
                if (options?.accountName && response.getRequest() instanceof LoginRequest) {
                    let requiresLogin = true;

                    try {
                        await UserApps.verifyKeyExistsForApp(options.accountName, {
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
        const issuers = new Set<string>();

        this.responses.map((response) => issuers.add(response.getRequest().getIssuer()));

        for (const issuer of issuers) {
            const apps = this.responses
                .filter((response) => response.getRequest().getIssuer() === issuer)
                .map((response) => response.getAppOrThrow());

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
                if (response.getMetaOrThrow().requiresLogin === true) {
                    await user.apps.loginWithApp(response.getAppOrThrow(), request.getPayload().publicKey);
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
        const responses = this.responses.filter(
            (response) => response.getAppOrThrow().origin === window.location.origin
        );

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
        const response = this.getResponsesWithDifferentOriginOrThrow().find(
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

    getResponsesWithDifferentOriginOrThrow(): WalletRequestAndResponseObject[] {
        return this.responses.filter((response) => response.getAppOrThrow().origin !== window.location.origin);
    }

    getAccountsLoginRequestsIssuerOrThrow(): string {
        return this.getAccountsLoginRequestOrThrow().getIssuer();
    }

    getAccountsLoginRequestOrThrow(): LoginRequest {
        const externalLoginResponse = this.responses.find(
            (response) =>
                response.getRequest() instanceof LoginRequest &&
                response.getRequest().getPayload().origin === getSettings().ssoWebsiteOrigin
        );

        if (!externalLoginResponse) throwError('No external login request found', SdkErrors.ResponsesNotFound);
        return externalLoginResponse.getRequest();
    }

    getExternalLoginResponseOrThrow(): WalletRequestAndResponseObject {
        const externalLoginResponse = this.responses.find(
            (response) =>
                response.getRequest() instanceof LoginRequest &&
                response.getRequest().getPayload().origin !== getSettings().ssoWebsiteOrigin
        );

        if (!externalLoginResponse) throwError('No external login request found', SdkErrors.ResponsesNotFound);
        return externalLoginResponse;
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
