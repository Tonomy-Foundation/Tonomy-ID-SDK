import { Name } from '@wharfkit/antelope';
import { KeyManagerLevel } from '../storage/keymanager';
import { IDContract } from '../services/blockchain/contracts/IDContract';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkErrors, throwError, SdkError } from '../util/errors';
import { getSettings } from '../util/settings';
import { Message, LinkAuthRequestMessage, LinkAuthRequestResponseMessage } from '../services/communication/message';
import { getAccountNameFromDid, parseDid } from '../util/ssi/did';
import { ICheckedRequest, IUserAppRecord, IUserRequestsManager } from '../types/User';
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
import { UserCommunication } from './UserCommunication';

const idContract = IDContract.Instance;

export class UserRequestsManager extends UserCommunication implements IUserRequestsManager {
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

            await this.sendMessage(linkAuthRequestResponseMessage);
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

            await this.sendMessage(message);
        }
    }

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
