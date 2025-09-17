/**
 * @jest-environment jsdom
 */

/* eslint-disable prettier/prettier */
/* eslint-disable camelcase */

import {
    App,
    KeyManager,
    StorageFactory,
    STORAGE_NAMESPACE,
    IdentifyMessage,
    LoginRequestResponseMessage,
    ExternalUser,
    DemoTokenContract,
    getSettings,
    DualWalletResponse,
    setSettings,
    Communication,
} from '../src/sdk/index';
import { JsKeyManager } from '../src/sdk/storage/jsKeyManager';
import { DataSource } from 'typeorm';
import { jest } from '@jest/globals';
import { setupTestDatabase } from './storage/testDatabase';
import {
    IUserPublic,
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
    scanQrAndAck,
    setupLoginRequestSubscriber,
} from './helpers/user';
import { sleep } from '../src/sdk/util/time';
import {
    externalWebsiteOnCallback,
    externalWebsiteOnReload,
    externalWebsiteUserPressLoginToTonomyButton,
    loginWebsiteOnCallback,
    loginWebsiteOnRedirect,
    sendLoginRequestsMessage,
    setupTonomyIdIdentifySubscriber,
    setupTonomyIdRequestConfirmSubscriber,
    externalWebsiteOnLogout,
    externalWebsiteSignVc,
    externalWebsiteSignTransaction,
    externalWebsiteClientAuth,
} from './helpers/externalUser';
import { createStorageFactory } from './helpers/storageFactory';
import { createSigner, getTokenContract, getTonomyOperationsKey } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import deployContract from '../src/cli/bootstrap/deploy-contract';
import { setReferrer, setUrl } from './helpers/browser';
import {  createSignedProofMessage, getBaseTokenContract } from '../src/sdk/services/ethereum';
import Decimal from 'decimal.js';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:externalUser.integration.test');

export type ExternalUserLoginTestOptions = {
    dataRequest: boolean;
    dataRequestUsername?: boolean;
    dataRequestKYC?: boolean;
    dataRequestKYCDecision?: 'approved' | 'declined';
    swapToken?: boolean;
};

setTestSettings();

const signer = createSigner(getTonomyOperationsKey());


describe('Login to external website', () => {
    jest.setTimeout(50000);

    // OBJECTS HERE denote the different devices/apps the user is using
    // it shows which device is doing what action and has access to which variables
    // TONOMY_ID_
    // EXTERNAL_WEBSITE_
    // TONOMY_LOGIN_WEBSITE_

    let TONOMY_ID_user: IUserPublic;
    let TONOMY_ID_did: string;
    let externalApp: App;
    let tonomyLoginApp: App;
    let TONOMY_LOGIN_WEBSITE_jsKeyManager: KeyManager;
    let EXTERNAL_WEBSITE_jsKeyManager: KeyManager;
    let TONOMY_LOGIN_WEBSITE_storage_factory: StorageFactory;
    let EXTERNAL_WEBSITE_storage_factory: StorageFactory;
    let EXTERNAL_WEBSITE_user: ExternalUser;
    let TONOMY_ID_dataSource: DataSource;
    const communicationsToCleanup: Communication[] = [];
    const userBaseAddress: string = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'; //default hardhat address[0]


    beforeEach(async () => {
        // Initialize typeorm data source
        TONOMY_ID_dataSource = await setupTestDatabase();

        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        debug('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        communicationsToCleanup.push(TONOMY_ID_user.communication);
        TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user);

        // Create app which will be logged into
        externalApp = await createRandomApp();

        debug('Deploying and configuring demo.tmy contract to ', externalApp.accountName.toString());
        await deployContract(
            { account: externalApp.accountName, contractDir: './Tonomy-Contracts/contracts/demo.tmy' },
            signer,
            {
                throughTonomyProxy: true,
                extraAuthorization: {
                    actor: 'tonomy',
                    permission: 'active',
                },
            }
        );
        const demoTokenContract = await DemoTokenContract.atAccount(externalApp.accountName);

        await demoTokenContract.create(
            demoTokenContract.contractName,
            `1000000000.000000 ${getSettings().currencySymbol}`,
            signer
        );
        await demoTokenContract.issue(demoTokenContract.contractName,
            `10000.000000 ${getSettings().currencySymbol}`, '',
            signer
        );

        tonomyLoginApp = await createRandomApp();
       
        setSettings({
            ...settings,
            ssoWebsiteOrigin: tonomyLoginApp.origin,
        });

        // setup KeyManagers for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_jsKeyManager = new JsKeyManager();
        EXTERNAL_WEBSITE_jsKeyManager = new JsKeyManager();

        // setup storage factories for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'external-website.');
    });

    afterEach(async () => {
        if (TONOMY_ID_user) {
            await TONOMY_ID_user.logout();
        }

        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
            TONOMY_ID_dataSource = await setupTestDatabase();
        }

        disconnectCommunications(communicationsToCleanup);

        debug('finished cleanup');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO: figure out why this is needed and remove issue
        await sleep(1000);
    });

    afterAll(async () => {
        if (TONOMY_ID_dataSource) {
            await TONOMY_ID_dataSource.destroy();
        }
    });

    describe('SSO login full end-to-end flow with external desktop browser (using communication service)', () => {
        test('Successful login to external website - no data request', async () => {
            expect.assertions(56);
            await runExternalUserLoginTest({ dataRequest: false });
        });

        test('Successful login to external website with empty data request', async () => {
            expect.assertions(57);
            await runExternalUserLoginTest({ dataRequest: true });
        });

        test('Successful login to external website with data request for username', async () => {
            expect.assertions(60);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestUsername: true });
        });

        test('Successful login to external website with data request for KYC verification successful', async () => {
            expect.assertions(88);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestKYC: true, dataRequestKYCDecision: 'approved' });
        });

        test('Unsuccessful login to external website with data request for KYC verification failed', async () => {
            expect.assertions(37);
            await runExternalUserLoginTest({ dataRequest: true, dataRequestKYC: true, dataRequestKYCDecision: 'declined' });
        });
        test('should create and send SwapTokenMessage with mocked Ethereum proof', async () => {
            expect.assertions(59);
            await runExternalUserLoginTest({ dataRequest: false, swapToken: true });           
        });
    });

    async function runExternalUserLoginTest(testOptions: ExternalUserLoginTestOptions) {
        // #####External website user (login page) #####
        // ################################

        // create request for external website
        // this would redirect the user to the tonomyLoginApp and send the token via the URL, but we're not doing that here
        // Instead we take the token as output

        setUrl(externalApp.origin + '/login');

        const { did: EXTERNAL_WEBSITE_did, redirectUrl: EXTERNAL_WEBSITE_redirectUrl } =
            await externalWebsiteUserPressLoginToTonomyButton(
                EXTERNAL_WEBSITE_jsKeyManager,
                tonomyLoginApp.origin,
                testOptions
            );

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // catch the externalAppToken in the URL
        setReferrer(externalApp.origin);
        setUrl(EXTERNAL_WEBSITE_redirectUrl);

        // Setup a request for the login app
        const {
            did: TONOMY_LOGIN_WEBSITE_did,
            requests: TONOMY_LOGIN_WEBSITE_requests,
            communication: TONOMY_LOGIN_WEBSITE_communication,
        } = await loginWebsiteOnRedirect(EXTERNAL_WEBSITE_did, TONOMY_LOGIN_WEBSITE_jsKeyManager);

        communicationsToCleanup.push(TONOMY_LOGIN_WEBSITE_communication);

        // setup subscriber for connection to Tonomy ID acknowledgement
        const { subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber, promise: TONOMY_LOGIN_WEBSITE_ackMessagePromise } =
            await setupTonomyIdIdentifySubscriber(TONOMY_ID_did);

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(0);
        const TONOMY_LOGIN_WEBSITE_subscription = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
            TONOMY_LOGIN_WEBSITE_messageSubscriber,
            IdentifyMessage.getType()
        );

        debug('TONOMY_LOGIN_WEBSITE_communication.socketServer', TONOMY_LOGIN_WEBSITE_communication.socketServer.listenersAny())
        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);

        // ##### Tonomy ID user (QR code scanner screen) #####
        // ##########################
        await scanQrAndAck(TONOMY_ID_user, TONOMY_LOGIN_WEBSITE_did);

        const TONOMY_ID_requestSubscriber = setupLoginRequestSubscriber(
            TONOMY_ID_user,
            TONOMY_LOGIN_WEBSITE_did,
            testOptions
        );

        // #####Tonomy Login App website user (login page) #####
        // ########################################

        // wait for the ack message to confirm Tonomy ID is connected
        const connectionMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_ackMessagePromise;

        expect(connectionMessageFromTonomyId.getSender()).toBe(TONOMY_ID_did + '#local');

        await sendLoginRequestsMessage(
            TONOMY_LOGIN_WEBSITE_requests,
            TONOMY_LOGIN_WEBSITE_jsKeyManager,
            TONOMY_LOGIN_WEBSITE_communication,
            connectionMessageFromTonomyId.getSender()
        );

        // setup subscriber that waits for the response that the requests are confirmed by Tonomy ID
        const {
            subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber2,
            promise: TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise,
        } = await setupTonomyIdRequestConfirmSubscriber(TONOMY_ID_did);

        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription);
        const TONOMY_LOGIN_WEBSITE_subscription2 = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
            TONOMY_LOGIN_WEBSITE_messageSubscriber2,
            LoginRequestResponseMessage.getType()
        );

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);

        // ##### Tonomy ID user (SSO screen) #####
        // ##########################

        // Wait for the subscriber to execute
        await TONOMY_ID_requestSubscriber;

        if (testOptions.dataRequestKYC && testOptions.dataRequestKYCDecision !== 'approved') {
            debug('TONOMY_ID/SSO: KYC verification failed, login was never executed by user');
            return;
        }

        // #####Tonomy Login App website user (callback page) #####
        // ########################################
        setUrl(tonomyLoginApp.origin);

        // Receive the message back, and redirect to the callback
        const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(1);
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription2);
        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('v1/message/relay/receive').length).toBe(0);

        const walletResponse = requestConfirmedMessageFromTonomyId.getPayload();

        expect(walletResponse).toBeDefined();
        expect(walletResponse.success).toBe(true);
        expect(walletResponse.external).toBeDefined();
        expect(walletResponse.sso).toBeDefined();

        expect(walletResponse.external?.getResponses()?.length).toBe(testOptions.dataRequest ? 2 : 1);
        expect(walletResponse.sso?.getResponses()?.length).toBe(2);

        expect(walletResponse.sso?.getAccountName().toString()).toBe(
            (await TONOMY_ID_user.getAccountName()).toString()
        );
        const dataRequestResponse = walletResponse.sso?.getDataSharingResponse();

        if (testOptions.dataRequest) {
            expect(dataRequestResponse).toBeDefined();

            if (testOptions.dataRequestUsername) {
                expect(dataRequestResponse?.data.username?.toString()).toBe(
                    (await TONOMY_ID_user.getUsername()).username.toString()
                );
            }
        }

        debug('TONOMY_LOGIN_WEBSITE/login: sending to callback page');
        setUrl(walletResponse.getRedirectUrl(false));

        const { responses: TONOMY_LOGIN_WEBSITE_responses } =
            await loginWebsiteOnCallback(TONOMY_LOGIN_WEBSITE_jsKeyManager, TONOMY_LOGIN_WEBSITE_storage_factory);

        if (!TONOMY_LOGIN_WEBSITE_responses.external) throw new Error('TONOMY_LOGIN_WEBSITE_responses.external is undefined');
        const EXTERNAL_WEBSITE_response = DualWalletResponse.fromResponses(TONOMY_LOGIN_WEBSITE_responses.external)
        const EXTERNAL_WEBSITE_redirectBackUrl = EXTERNAL_WEBSITE_response.getRedirectUrl();

        // #####External website user (callback page) #####
        // ################################

        setUrl(EXTERNAL_WEBSITE_redirectBackUrl);

        EXTERNAL_WEBSITE_user = await externalWebsiteOnCallback(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            await TONOMY_ID_user.getAccountName(),
            testOptions
        );

        await disconnectCommunications([getProtectedCommunication(EXTERNAL_WEBSITE_user)]);

        EXTERNAL_WEBSITE_user = await externalWebsiteOnReload(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            TONOMY_ID_user
        );
        communicationsToCleanup.push(getProtectedCommunication(EXTERNAL_WEBSITE_user));

        await externalWebsiteSignVc(EXTERNAL_WEBSITE_user);

        await externalWebsiteSignTransaction(EXTERNAL_WEBSITE_user, externalApp);

        if (testOptions.swapToken) {
        
            const amount = new Decimal("0.5");
            const tonoAddress = (await EXTERNAL_WEBSITE_user.getAccountName()).toString();
            
            // 1. Get balances before
            const baseTokenContract = getBaseTokenContract();
            //getting error in balanceOf call needs to be fixed
            const balanceBeforeBase = await baseTokenContract.balanceOf(userBaseAddress);
            const tokenContract = getTokenContract();
            
            const balanceBeforeTonomy = await tokenContract.getBalanceDecimal(tonoAddress);

            console.log("Before Swap:", userBaseAddress);
            console.log("Base balance:", balanceBeforeBase.toString());
            console.log("Tonomy balance:", balanceBeforeTonomy.toString());
            // 4. Send via communication
            const proof = await createSignedProofMessage()
            const result = await EXTERNAL_WEBSITE_user.swapTokenService(amount, proof, 'base');

            expect(result).toBe(true);
            const balanceAfterBase = await baseTokenContract.balanceOf(userBaseAddress);
            const balanceAfterTonomy = await tokenContract.getBalanceDecimal(tonoAddress);

            console.log("After Swap:");
            console.log("Base balance:", balanceAfterBase.toString());
            console.log("Tonomy balance:", balanceAfterTonomy.toString());
        }


        await externalWebsiteClientAuth(EXTERNAL_WEBSITE_user, externalApp, testOptions);

        await externalWebsiteOnLogout(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);
    }

    async function disconnectCommunications(communications: Communication[]) {
        for (const communication of communications) {
            await communication.disconnect();
        }

        debug('finished disconnecting all communications');
    }
});

function getProtectedCommunication(user: ExternalUser): Communication {
    return (user as unknown as { communication: Communication }).communication;
}

        