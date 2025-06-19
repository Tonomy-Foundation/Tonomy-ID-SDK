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
    ClientAuthorizationData,
    randomString,
} from '../src/sdk/index';
import { VerificationType } from '../src/sdk/storage/entities/identityVerificationStorage';
import { JsKeyManager } from '../src/sdk/storage/jsKeyManager';
import { receivingVerification, VeriffWebhookPayload } from '../src/sdk/services/communication/veriff';
import { DataSource } from 'typeorm';
import { IdentityVerificationStorageRepository } from '../src/sdk/storage/identityVerificationStorageRepository';
import { jest } from '@jest/globals';
// helpers
import {
    setupTestDatabase,
    teardownTestDatabase,
} from './setup';
// helpers
import {
    IUserPublic,
    createRandomApp,
    createRandomID,
    loginToTonomyCommunication,
    scanQrAndAck,
    setupLoginRequestSubscriber,
    mockVeriffWebhook,
} from './helpers/user';
import { verifyClientAuthorization } from '../src/api/externalUser'
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
import { createSigner, getTonomyOperationsKey } from '../src/sdk/services/blockchain';
import { setTestSettings, settings } from './helpers/settings';
import deployContract from '../src/cli/bootstrap/deploy-contract';
import { setReferrer, setUrl } from './helpers/browser';
import Debug from 'debug';

const debug = Debug('tonomy-sdk-tests:externalUser.integration.test');

// Remove duplicate imports since we already imported these from veriff service above

export type ExternalUserLoginTestOptions = {
    dataRequest: boolean;
    dataRequestUsername?: boolean;
    dataRequestKYC?: boolean;
};

setTestSettings();

const signer = createSigner(getTonomyOperationsKey());

describe('Login to external website', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = await setupTestDatabase();
        // Initialize veriff service with database connection

    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    // Reset database between tests
    afterEach(async () => {
        if (dataSource) {
            await dataSource.synchronize(true);
        }
    });

    jest.setTimeout(30000);

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

    beforeEach(async () => {
        // Initialize EXTERNAL_WEBSITE_user
        debug('EXTERNAL_WEBSITE: creating new external user');
        EXTERNAL_WEBSITE_user = new ExternalUser(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory
        );

        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        debug('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user);
        // ##### Tonomy ID user #####
        // ##########################
        // Create new Tonomy ID user
        debug('TONOMY_ID: creating new Tonomy ID user');
        TONOMY_ID_user = (await createRandomID()).user;
        TONOMY_ID_did = await TONOMY_ID_user.getDid();

        expect(TONOMY_ID_did).toContain('did:antelope:');

        await loginToTonomyCommunication(TONOMY_ID_user);

        // Create two apps which will be logged into
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
        await DemoTokenContract.atAccount(externalApp.accountName).create(
            `1000000000.000000 ${getSettings().currencySymbol}`,
            signer
        );
        await DemoTokenContract.atAccount(externalApp.accountName).issue(
            `10000.000000 ${getSettings().currencySymbol}`,
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
        await EXTERNAL_WEBSITE_user.initializeDataVault(dataSource, TONOMY_ID_user.communication);

        // setup storage factories for the external website and tonomy login website
        TONOMY_LOGIN_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'login-website.');
        EXTERNAL_WEBSITE_storage_factory = createStorageFactory(STORAGE_NAMESPACE + 'external-website.');
    });

    afterEach(async () => {
        if (TONOMY_ID_user) {
            await TONOMY_ID_user.logout();
        }

        debug('finished test');

        // for some reason this is needed to ensure all the code lines execute. Not sure why needed
        // TODO: figure out why this is needed and remove issue
        await sleep(500);
    });

    describe('SSO login full end-to-end flow with external desktop browser (using communication service)', () => {
        test('Successful login to external website', async () => {
            await runExternalUserLoginTest({ dataRequest: false });
        });

        test('Successful login to external website with empty data request', async () => {
            await runExternalUserLoginTest({ dataRequest: true });
        });

        test('Successful login to external website with data request for username', async () => {
            await runExternalUserLoginTest({ dataRequest: true, dataRequestUsername: true });
        });

        test('Successful login to external website with data request for KYC verification', async () => {
            await runExternalUserLoginTest({ dataRequest: true, dataRequestKYC: true });
        });

        test('Successful login with Veriff KYC verification', async () => {
            await runExternalUserLoginVeriffTest({ decision: 'approved' });
        });

        test('Failed Veriff KYC verification', async () => {
            await runExternalUserLoginVeriffTest({ decision: 'declined' });
        });
    });

    async function runExternalUserLoginVeriffTest({ decision }: { decision: 'approved' | 'declined' }) {
        expect.assertions(decision === 'approved' ? 9 : 4);
        const testOptions = {
            dataRequest: true,
            dataRequestKYC: true,
        };

        // Generate a random session ID for Veriff
        const sessionId = `veriff-session-${Math.random().toString(36).substring(2)}`;

        // Create external user
        const externalUser = new ExternalUser(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);

        // Step 1: User presses login button with Veriff data request
        const { did: externalWebsiteDid } = await externalWebsiteUserPressLoginToTonomyButton(
            EXTERNAL_WEBSITE_jsKeyManager,
            tonomyLoginApp.origin,
            testOptions
        );

        // Step 2: Mock Veriff webhook callback
        await mockVeriffWebhook(
            externalWebsiteDid,
            sessionId,
            decision
        );

        // Step 3: Process the Veriff webhook response
        const credentials: VeriffWebhookPayload = {
            status: 'success',
            eventType: 'fullauto',
            sessionId,
            attemptId: randomString(16),
            vendorData: null,
            endUserId: null,
            version: '1.0',
            acceptanceTime: new Date().toISOString(),
            time: new Date().toISOString(),
            data: {
                verification: {
                    decision,
                    decisionScore: decision === 'approved' ? 100 : null,
                    person: {},
                    document: {},
                    insights: null
                }
            }
        };
        // Use the standalone receivingVerification function
        const repository = new IdentityVerificationStorageRepository(dataSource);

        await receivingVerification(credentials, dataSource);
        
        // Wait for async operations to complete
        await sleep(1000);
        
        // Check for KYC verification using the repository
        const kycVerification = await repository.findLatestApproved(VerificationType.KYC);

        expect(kycVerification).toBeDefined();
        expect(kycVerification?.vc).toBeDefined();

        if (!kycVerification) {
            throw new Error('KYC verification should not be null at this point');
        }

        if (decision === 'approved') {
            const verificationData = JSON.parse(kycVerification.vc!);

            expect(verificationData.data.verification.decision).toBe(decision);
            // Step 4: Create VCs for KYC data
            await externalUser.signVc(
                `${sessionId}-kyc`,
                ['KYCVerification'],
                {
                    verified: true,
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-01-01',
                    nationality: 'US',
                    documentType: 'passport',
                    documentNumber: 'AB123456',
                    verificationDate: new Date().toISOString()
                }
            );

            await externalUser.signVc(
                `${sessionId}-name`,
                ['NameVerification'],
                {
                    firstName: 'John',
                    lastName: 'Doe'
                }
            );

            await externalUser.signVc(
                `${sessionId}-dob`,
                ['DateOfBirthVerification'],
                {
                    dateOfBirth: '1990-01-01'
                }
            );

            // Step 5: Complete client auth with KYC data
            const clientAuth = await externalUser.createClientAuthorization({
                verified: true,
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                nationality: 'US',
                documentType: 'passport',
                documentNumber: 'AB123456',
                verificationDate: new Date().toISOString()
            });

            expect(clientAuth).toBeDefined();
            
            // Verify client auth
            const verifiedAuth = await verifyClientAuthorization<ClientAuthorizationData>(clientAuth, {
                verifyUsername: false,
                verifyOrigin: false
            });
            
            expect(verifiedAuth).toBeDefined();
            expect(verifiedAuth.data).toBeDefined();
            expect(verifiedAuth.data.verified).toBe(true);
            expect(verifiedAuth.data).toHaveProperty('kyc'); 
            expect(verifiedAuth.data.kyc?.verified).toBe(true);
        } else {
            // Step 4: Attempt client auth should fail
            expect(kycVerification?.vc).toBeNull();

            await expect(
                externalWebsiteClientAuth(externalUser, externalApp, testOptions)
            ).rejects.toThrow();
        }
    }

    async function runExternalUserLoginTest(testOptions: ExternalUserLoginTestOptions) {
        let expectedTests = 56;

        if (testOptions.dataRequest) {
            expectedTests += 1;
            if (testOptions.dataRequestUsername) expectedTests += 3;
            if (testOptions.dataRequestKYC) expectedTests += 9; // 9 additional assertions for KYC verification
        }

        expect.assertions(expectedTests);

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

        // setup subscriber for connection to Tonomy ID acknowledgement
        const { subscriber: TONOMY_LOGIN_WEBSITE_messageSubscriber, promise: TONOMY_LOGIN_WEBSITE_ackMessagePromise } =
            await setupTonomyIdIdentifySubscriber(TONOMY_ID_did);

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);
        const TONOMY_LOGIN_WEBSITE_subscription = TONOMY_LOGIN_WEBSITE_communication.subscribeMessage(
            TONOMY_LOGIN_WEBSITE_messageSubscriber,
            IdentifyMessage.getType()
        );

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

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

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);

        // ##### Tonomy ID user (SSO screen) #####
        // ##########################

        // Wait for the subscriber to execute
        await TONOMY_ID_requestSubscriber;

        // #####Tonomy Login App website user (callback page) #####
        // ########################################
        setUrl(tonomyLoginApp.origin);

        // Receive the message back, and redirect to the callback
        const requestConfirmedMessageFromTonomyId = await TONOMY_LOGIN_WEBSITE_requestsConfirmedMessagePromise;

        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(1);
        TONOMY_LOGIN_WEBSITE_communication.unsubscribeMessage(TONOMY_LOGIN_WEBSITE_subscription2);
        expect(TONOMY_LOGIN_WEBSITE_communication.socketServer.listeners('message').length).toBe(0);

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
            await TONOMY_ID_user.getAccountName()
        );

        await EXTERNAL_WEBSITE_user.communication.disconnect();

        EXTERNAL_WEBSITE_user = await externalWebsiteOnReload(
            EXTERNAL_WEBSITE_jsKeyManager,
            EXTERNAL_WEBSITE_storage_factory,
            TONOMY_ID_user
        );

        await externalWebsiteSignVc(EXTERNAL_WEBSITE_user);

        await externalWebsiteSignTransaction(EXTERNAL_WEBSITE_user, externalApp);

        await externalWebsiteClientAuth(EXTERNAL_WEBSITE_user, externalApp, testOptions);

        await externalWebsiteOnLogout(EXTERNAL_WEBSITE_jsKeyManager, EXTERNAL_WEBSITE_storage_factory);

        // cleanup connections
        await TONOMY_LOGIN_WEBSITE_communication.disconnect();
        await EXTERNAL_WEBSITE_user.communication.disconnect();
    }
});