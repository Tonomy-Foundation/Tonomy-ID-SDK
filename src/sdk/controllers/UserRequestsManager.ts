import { Name } from '@wharfkit/antelope';
import { KeyManagerLevel } from '../storage/keymanager';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkErrors, throwError, SdkError } from '../util/errors';
import { getSettings } from '../util/settings';
import { Message, LinkAuthRequestMessage, LinkAuthRequestResponseMessage } from '../services/communication/message';
import { getAccountNameFromDid, parseDid } from '../util/ssi/did';
import { AbstractUserBase, ICheckedRequest, IUserAppRecord, IUserRequestsManager } from '../types/User';
import { PublicKey } from '@wharfkit/antelope';
import { LoginRequest } from '../util/request';
import { LoginRequestResponseMessage } from '../services/communication/message';
import { LoginRequestResponseMessagePayload } from '../services/communication/message';
import { objToBase64Url } from '../util/base64';
import { DID, URL as URLtype } from '../util/ssi/types';
import { RequestsManager } from '../helpers/requestsManager';
import { ResponsesManager } from '../helpers/responsesManager';
import { App } from './App';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { verifyKeyExistsForApp } from '../helpers/user';

const idContract = IDContract.Instance;

export abstract class AbstractUserRequestsManager extends AbstractUserBase implements IUserRequestsManager {
    async handleLinkAuthRequestMessage(message: Message): Promise<void> {
        const linkAuthRequestMessage = new LinkAuthRequestMessage(message);

        try {
            if (!getAccountNameFromDid(message.getSender()).equals(await this.getAccountName()))
                throwError('Message not sent from authorized account', SdkErrors.SenderNotAuthorized);

            const payload = linkAuthRequestMessage.getPayload();

            const contract = payload.contract;
            const action = payload.action;

            const permission = parseDid(message.getSender()).fragment;

            if (!permission) throwError('DID does not contain fragment', SdkErrors.MissingParams);

            await idContract.getApp(Name.from(permission));
            // Throws SdkErrors.DataQueryNoRowDataFound error if app does not exist
            // which cannot happen in theory, as the user is already logged in

            const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.ACTIVE);

            await idContract.linkAuth(
                (await this.getAccountName()).toString(),
                contract.toString(),
                action.toString(),
                permission,
                signer
            );

            const linkAuthRequestResponseMessage = await LinkAuthRequestResponseMessage.signMessage(
                {
                    requestId: linkAuthRequestMessage.getVc().getId() as string,
                    success: true,
                },
                await this.getIssuer(),
                linkAuthRequestMessage.getSender()
            );

            await this.communication.sendMessage(linkAuthRequestResponseMessage);
        } catch (e) {
            if (e instanceof SdkError && e.code === SdkErrors.SenderNotAuthorized) {
                // somebody may be trying to DoS the user, drop
                return;
            } else {
                // all other errors are Tonomy software errors, so throw to bubble up
                throw e;
            }
        }
    }

    async loginWithApp(app: App, key: PublicKey): Promise<void> {
        const myAccount = await this.storage.accountName;

        const appRecord: IUserAppRecord = {
            app,
            added: new Date(),
            status: AppStatusEnum.PENDING,
        };

        let apps = await this.storage.appRecords;

        if (!apps) {
            apps = [];
        }

        apps.push(appRecord);
        this.storage.appRecords = apps;
        await this.storage.appRecords;

        const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.LOCAL);

        await idContract.loginwithapp(myAccount.toString(), app.accountName.toString(), 'local', key, signer);

        appRecord.status = AppStatusEnum.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    /** Accepts a login request by authorizing keys on the blockchain (if the are not already authorized)
     * And sends a response to the requesting app
     *
     * @param {{request: WalletRequest, app?: App, requiresLogin?: boolean}[]} requestsWithMetadata - Array of requests to fulfill (login or data sharing requests)
     * @param {'mobile' | 'browser'} platform - Platform of the request, either 'mobile' or 'browser'
     * @param {{callbackPath?: URLtype, messageRecipient?: DID}} options - Options for the response
     * @returns {Promise<void | URLtype>} the callback url if the platform is mobile, or undefined if it is browser (a message is sent to the user)
     */
    async acceptLoginRequest(
        responsesManager: ResponsesManager,
        platform: 'mobile' | 'browser',
        options: {
            callbackOrigin?: URLtype;
            callbackPath?: URLtype;
            messageRecipient?: DID;
        }
    ): Promise<void | URLtype> {
        const finalResponses = await responsesManager.createResponses(this);

        const responsePayload: LoginRequestResponseMessagePayload = {
            success: true,
            response: finalResponses,
        };

        if (platform === 'mobile') {
            if (!options.callbackPath || !options.callbackOrigin)
                throwError('Missing callback origin or path', SdkErrors.MissingParams);
            let callbackUrl = options.callbackOrigin + options.callbackPath + '?';

            callbackUrl += 'payload=' + objToBase64Url(responsePayload);

            return callbackUrl;
        } else {
            if (!options.messageRecipient) throwError('Missing message recipient', SdkErrors.MissingParams);
            const issuer = await this.getIssuer();
            const message = await LoginRequestResponseMessage.signMessage(
                responsePayload,
                issuer,
                options.messageRecipient
            );

            await this.communication.sendMessage(message);
        }
    }

    /** Verifies the login requests, and checks if the apps have already been authorized with those keys
     * This function is currently only used in the unfinished feature https://github.com/Tonomy-Foundation/Tonomy-ID/issues/705
     * See unmerged PR https://github.com/Tonomy-Foundation/Tonomy-ID/pull/744
     * @depreciated This function is now incorporated in ResponsesManager.fetchMeta()
     *
     * @param {LoginRequest[]} requests - Array of LoginRequest to check
     * @returns {Promise<CheckedRequest[]>} - Array of requests that have been verified and had authorization checked
     */
    async checkLoginRequests(requests: LoginRequest[]): Promise<ICheckedRequest[]> {
        const managedRequests = new RequestsManager(requests);

        await managedRequests.verify();

        const response: ICheckedRequest[] = [];

        for (const request of managedRequests.getLoginRequestsOrThrow()) {
            const payload = request.getPayload();

            const app = await App.getApp(payload.origin);

            let requiresLogin = true;

            try {
                await verifyKeyExistsForApp(await this.getAccountName(), {
                    publicKey: payload.publicKey,
                });
                requiresLogin = false;
            } catch (e) {
                if (e instanceof SdkError && e.code === SdkErrors.UserNotLoggedInWithThisApp) {
                    // Never consented
                    requiresLogin = true;
                } else {
                    throw e;
                }
            }

            response.push({
                request,
                app,
                requiresLogin,
                ssoApp: payload.origin === getSettings().ssoWebsiteOrigin,
                requestDid: request.getIssuer(),
            });
        }

        return response;
    }
}
