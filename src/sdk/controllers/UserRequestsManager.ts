import { Name } from '@wharfkit/antelope';
import { KeyManagerLevel } from '../storage/keymanager';
import { getTonomyEosioProxyContract } from '../services/blockchain/contracts/TonomyEosioProxyContract';
import { getTonomyContract } from '../services/blockchain';
import { createKeyManagerSigner } from '../services/blockchain/eosio/transaction';
import { SdkErrors, throwError, SdkError } from '../util/errors';
import { Message, LinkAuthRequestMessage, LinkAuthRequestResponseMessage } from '../services/communication/message';
import { getAccountNameFromDid, parseDid } from '../util/ssi/did';
import { IUserAppRecord, IUserRequestsManager } from '../types/User';
import { PublicKey } from '@wharfkit/antelope';
import { LoginRequestResponseMessage } from '../services/communication/message';
import { URL as URLtype } from '../util/ssi/types';
import { App } from './App';
import { AppStatusEnum } from '../types/AppStatusEnum';
import { getAccountInfo } from '../helpers/user';
import { UserCommunication } from './UserCommunication';
import { DualWalletRequests, sleep } from '../util';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:UserRequestsManager');

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

            if (!permission) throwError('DID does not contain App permission', SdkErrors.MissingParams);

            await getTonomyContract().getApp(Name.from(permission));
            // Throws SdkErrors.DataQueryNoRowDataFound error if app does not exist
            // which cannot happen in theory, as the user is already logged in

            // if (permission !== contract.toString())
            //     throwError('Contract and permission do not match', SdkErrors.MismatchedParams);

            const signer = createKeyManagerSigner(this.keyManager, KeyManagerLevel.ACTIVE);

            await getTonomyEosioProxyContract().linkAuth(
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
        const myAccount = await this.getAccountName();

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

        const localSigner = createKeyManagerSigner(this.keyManager, KeyManagerLevel.LOCAL);
        let linkAuth = false;

        try {
            (await getAccountInfo(myAccount)).getPermission(app.accountName);
        } catch (e) {
            if (e.message === `Unknown permission ${app.accountName.toString()} on account ${myAccount.toString()}.`) {
                linkAuth = true;
            }
        }

        debug('loginWithApp key', key.toString(), linkAuth);

        await getTonomyContract().loginwithapp(
            myAccount.toString(),
            app.accountName.toString(),
            'local',
            key,
            localSigner
        );

        // If the permission was only just created, we link it to the app (using its account name)
        // so that this permission can be used to sign transactions in the app immediately
        // (otherwise a LinkAuthRequestMessage needs to be sent and executed with ExternalUser.checkLinkAuthRequirements())
        // when a transaction attempt is made in the app
        if (linkAuth) {
            await sleep(1000); // wait for the blockchain to catch up
            const activeSigner = createKeyManagerSigner(this.keyManager, KeyManagerLevel.ACTIVE);

            await getTonomyEosioProxyContract().linkAuth(
                myAccount.toString(),
                app.accountName.toString(),
                '',
                app.accountName.toString(),
                activeSigner
            );
        }

        appRecord.status = AppStatusEnum.READY;
        this.storage.appRecords = apps;
        await this.storage.appRecords;
    }

    /**
     *
     * @param {DualWalletRequests} requests - the login requests
     * @param {'mobile' | 'browser'} platform - the platform where the login request is being accepted
     * @returns {Promise<void | URLtype>} - if the platform is mobile, returns the callback URL to redirect the user back to the external app; if the platform is browser, sends a message with the response
     */
    async acceptLoginRequest(requests: DualWalletRequests, platform: 'mobile' | 'browser'): Promise<void | URLtype> {
        const responses = await requests.accept(this);

        if (platform === 'mobile') {
            // Redirect the user back to the external
            return responses.getRedirectUrl();
        } else {
            if (!requests.sso) throw new Error('SSO requests are missing in the login request message');
            const messageRecipient = requests.sso.getDid();
            const issuer = await this.getIssuer();
            const message = await LoginRequestResponseMessage.signMessage(responses, issuer, messageRecipient);

            await this.sendMessage(message);
        }
    }
}
