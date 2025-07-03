import {
    randomString,
    KeyManager,
    App,
    User,
    JsKeyManager,
    IdentifyMessage,
    AuthenticationMessage,
    LoginRequestsMessage,
    StorageFactory,
    IUserStorage,
    Communication,
    IUser,
} from '../../src/sdk/index';
// Using require for modules that might not have TypeScript definitions
import { expect } from '@jest/globals';
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { DIDurl } from '../../src/sdk/util/ssi/types';
import {
    AddressVC,
    BirthDateVC,
    FirstNameVC,
    generateRandomKeywords,
    KYCPayload,
    KYCVC,
    LastNameVC,
    NationalityVC,
    parseAntelopeDid,
} from '../../src/sdk/util';
import { ExternalUserLoginTestOptions } from '../externalUser.integration.test';
import { getChainId, getTonomyOperationsKey } from '../../src/sdk/services/blockchain/eosio/eosio';
import { createSigner } from '../../src/sdk/services/blockchain';

// Using require for modules that might not have TypeScript definitions
import Debug from 'debug';
import { dataSource } from '../storage/testDatabase';
import {
    mockVeriffWebhook,
    mockVeriffWebhookPayloadApproved,
    mockVeriffWebhookPayloadDeclined,
} from '../services/veriffMock';
import { VerificationTypeEnum } from '../../src/sdk/types/VerificationTypeEnum';
import { DataSource } from 'typeorm';

const debug = Debug('tonomy-sdk-tests:helpers:user');

export interface IUserPublic extends IUser {
    keyManager: KeyManager;
    storage: IUserStorage;
    dataSource: DataSource;
    communication: Communication;
}

export function createTestUserObject(
    keyManager: KeyManager,
    storageFactory: StorageFactory,
    dataSource: DataSource
): IUserPublic {
    return new User(keyManager, storageFactory, dataSource) as unknown as IUserPublic;
}

export const HCAPCHA_CI_RESPONSE_TOKEN = '10000000-aaaa-bbbb-cccc-000000000001';

export async function createRandomID(checkKeys = true) {
    const auth: KeyManager = new JsKeyManager();
    const user = createTestUserObject(auth, jsStorageFactory, dataSource);

    const username = randomString(8);
    const password = generateRandomKeywords().join(' ');
    const pin = Math.floor(Math.random() * 5).toString();

    await user.saveUsername(username);
    await user.savePassword(password, { keyFromPasswordFn: generatePrivateKeyFromPassword });
    checkKeys && (await user.savePIN(pin));
    checkKeys && (await user.saveFingerprint());
    await user.saveLocal();
    await user.saveCaptchaToken(HCAPCHA_CI_RESPONSE_TOKEN);
    await user.createPerson();
    await user.updateKeys(password);
    return { user, password, pin, auth, username };
}

export async function createRandomApp(logoUrl?: string, origin?: string): Promise<App> {
    const name = randomString(8);
    const description = randomString(80);

    const port = Math.floor(Math.random() * 65535);

    origin = origin || `http://localhost:${port}`;
    logoUrl = logoUrl || `${origin}/logo.png`;

    return await App.create({
        usernamePrefix: randomString(8),
        appName: name,
        description: description,
        logoUrl,
        origin,
        backgroundColor: '#ffffff',
        accentColor: '#CBCBCB',
        publicKey: getTonomyOperationsKey().toPublic(),
        signer: createSigner(getTonomyOperationsKey()),
    });
}

export async function loginToTonomyCommunication(user: IUserPublic) {
    const issuer = await user.getIssuer();
    // Login to Tonomy Communication as the user
    const authMessage = await AuthenticationMessage.signMessageWithoutRecipient({}, issuer);

    debug('TONOMY_ID/appStart: connect to Tonomy Communication');

    const loginResponse = await user.loginCommunication(authMessage);

    expect(loginResponse).toBe(true);
}

export async function scanQrAndAck(user: IUserPublic, qrCodeData: string) {
    debug('TONOMY_ID/scanQR: Scanning QR code with Tonomy ID app');

    // BarCodeScannerResult. See Tonomy-ID/node_modules/expo-barcode-scanner/src/BarCodeScanner.tsx
    const barcodeScanResults = {
        data: qrCodeData,
    };

    const connectMessage = await IdentifyMessage.signMessage({}, await user.getIssuer(), barcodeScanResults.data);

    debug("TONOMY_ID/scanQr: connecting to Tonomy Login Website's with their did:key from the QR code");
    const sendMessageResponse = await user.sendMessage(connectMessage);

    expect(sendMessageResponse).toBe(true);
}

export async function setupLoginRequestSubscriber(
    user: IUserPublic,
    tonomyLoginDid: DIDurl,
    testOptions: ExternalUserLoginTestOptions
) {
    // Setup a promise that resolves when the subscriber executes
    // This emulates the Tonomy ID app, which waits for the user requests
    return new Promise((resolve) => {
        user.subscribeMessage(async (message) => {
            const loginRequestMessage = new LoginRequestsMessage(message);

            debug('TONOMY_ID/SSO: receive login requests from Tonomy Login Website');

            // receive and verify the requests
            const requests = loginRequestMessage.getPayload();

            // TODO: check this throws an error if requests are not valid, or not signed correctly
            debug('TONOMY_ID/SSO: verifying login request');
            await requests.verify();

            // Calculate expected number of requests based on test options
            let expectedRequestCount = 1; // Base request

            if (testOptions.dataRequest) {
                expectedRequestCount++; // Data request
            }

            expect(requests.external.getRequests().length).toBe(expectedRequestCount);

            if (!requests.sso) throw new Error('SSO requests are missing in the login request message');
            const receiverDid = requests.sso.getDid();

            expect(receiverDid).toBe(tonomyLoginDid);
            expect(receiverDid).toBe(loginRequestMessage.getSender());

            let verificationEventPromise: Promise<KYCPayload>;

            // If KYC verification is requested, mock the KYC verification process
            if (testOptions.dataRequestKYC) {
                debug('TONOMY_ID/SSO: mocking user KYC verification process');

                if (!testOptions.dataRequestKYCDecision) {
                    throw new Error('dataRequestKYCDecision is required when dataRequestKYC is true');
                }

                expect(user.communication.socketServer.listeners('v1/verification/veriff/receive').length).toBe(0);
                verificationEventPromise = user.waitForNextVeriffVerification();
                const mockData =
                    testOptions.dataRequestKYCDecision === 'approved'
                        ? mockVeriffWebhookPayloadApproved
                        : mockVeriffWebhookPayloadDeclined;

                debug('TONOMY_ID/SSO: mocking calling the webhook (user completed KYC flow)');
                await mockVeriffWebhook(mockData);
                expect(user.communication.socketServer.listeners('v1/verification/veriff/receive').length).toBe(1);
                const verificationEvent = await verificationEventPromise;

                expect(user.communication.socketServer.listeners('v1/verification/veriff/receive').length).toBe(0);
                expect(verificationEvent.status).toBe('success');
                expect(verificationEvent.data.verification.decision).toBe(testOptions.dataRequestKYCDecision);
                expect(verificationEvent.data.verification.person.firstName).toBeDefined();
                expect(verificationEvent.data.verification.person.firstName?.value).toBe(
                    mockData.data.verification.person.firstName?.value
                );

                const kycVc = (await user.fetchVerificationData(VerificationTypeEnum.KYC)) as KYCVC;
                const issuer = kycVc.getIssuer();
                const { fragment, account, chain } = parseAntelopeDid(issuer);

                expect(kycVc instanceof KYCVC).toBe(true);
                expect(account).toBe('ops.tmy');
                expect(fragment).toBe('active');
                expect(chain).toBe(getChainId().toString());
                expect(kycVc.getType()).toBe(KYCVC.getType());

                const kycPayload = kycVc.getPayload();

                expect(kycPayload.data.verification.decision).toBe(testOptions.dataRequestKYCDecision);
                expect(kycPayload.data.verification.person.firstName).toBeDefined();
                expect(kycPayload.data.verification.person.firstName?.value).toBe(
                    mockData.data.verification.person.firstName?.value
                );

                const firstNameVc = (await user.fetchVerificationData(VerificationTypeEnum.FIRSTNAME)) as FirstNameVC;
                const lastNameVc = (await user.fetchVerificationData(VerificationTypeEnum.LASTNAME)) as LastNameVC;
                const birthDateVc = (await user.fetchVerificationData(VerificationTypeEnum.BIRTHDATE)) as BirthDateVC;
                const nationalityVc = (await user.fetchVerificationData(
                    VerificationTypeEnum.NATIONALITY
                )) as NationalityVC;
                const addressVc = (await user.fetchVerificationData(VerificationTypeEnum.ADDRESS)) as AddressVC;

                expect(firstNameVc).toBeDefined();
                expect(lastNameVc).toBeDefined();
                expect(birthDateVc).toBeDefined();
                expect(nationalityVc).toBeDefined();
                expect(addressVc).toBeDefined();
                debug('TONOMY_ID/SSO: KYC verification completed');
            }

            debug('TONOMY_ID/SSO: accepting login requests and sending confirmation to Tonomy Login Website');
            await user.acceptLoginRequest(requests, 'message');

            resolve(true);
        }, LoginRequestsMessage.getType());
    });
}
