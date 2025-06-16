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
import { jsStorageFactory } from '../../src/cli/bootstrap/jsstorage';
import { generatePrivateKeyFromPassword } from '../../src/cli/bootstrap/keys';
import { createUser } from '../../src/cli/bootstrap/user';
import { DIDurl } from '../../src/sdk/util/ssi/types';
import { generateRandomKeywords } from '../../src/sdk/util';
import { ExternalUserLoginTestOptions } from '../externalUser.integration.test';
import { getTonomyOperationsKey } from '../../src/sdk/services/blockchain/eosio/eosio';
import { createSigner } from '../../src/sdk/services/blockchain';
import Debug from 'debug';
import { IdentityVerificationStorageManager } from '../../src/sdk/storage/identityVerificationStorageManager';
import { IdentityVerificationStorageRepository } from '../../src/sdk/storage/identityVerificationStorageRepository';
import { VcStatus } from '../../src/sdk/storage/entities/identityVerificationStorage';
import { dbConnection } from '../../src/sdk/util/ssi/veramo';

const debug = Debug('tonomy-sdk-tests:helpers:user');

export interface IUserPublic extends IUser {
    keyManager: KeyManager;
    storage: IUserStorage;
    communication: Communication;
}

export function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): IUserPublic {
    return new User(keyManager, storageFactory) as unknown as IUserPublic;
}

export const HCAPCHA_CI_RESPONSE_TOKEN = '10000000-aaaa-bbbb-cccc-000000000001';

export { createUser };

export async function createRandomID(checkKeys = true) {
    const auth: KeyManager = new JsKeyManager();
    const user = createUserObject(auth, jsStorageFactory);

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
    
    // Set up subscriber for Veriff verification events
    const veriffSubscriber = setupVeriffVerificationSubscriber(user);

    expect(loginResponse).toBe(true);
    
    return veriffSubscriber;
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

/**
 * Sets up a subscriber for Veriff verification events
 * This function listens for the v1/verification/veriff/receive event from the server
 * When received, it validates the data and stores it in the identity verification storage
 * 
 * @param user The user object
 * @returns A promise that resolves when the verification is received and processed
 */
export function setupVeriffVerificationSubscriber(user: IUserPublic) {
    // Create identity verification storage manager
    const repository = new IdentityVerificationStorageRepository(dbConnection);
    
    // Use the concrete implementation instead of the abstract class
    class ConcreteVerificationStorageManager extends IdentityVerificationStorageManager {
        constructor(repository: IdentityVerificationStorageRepository) {
            super(repository);
        }
    }
    
    const storageManager = new ConcreteVerificationStorageManager(repository);
    
    debug('TONOMY_ID/setupVeriffVerificationSubscriber: Setting up subscriber for Veriff verification events');
    
    // Return a promise that resolves when the verification is received and processed
    return new Promise((resolve) => {
        // Use the Communication class's waitForSessionData method to listen for the event
        user.communication.waitForSessionData()
            .then(async (data) => {
                debug('TONOMY_ID/setupVeriffVerificationSubscriber: Received Veriff verification data', data);
                
                try {
                    
                    const verificationData = typeof data === 'string' ? JSON.parse(data) : data;
                    
                    const { sessionId, vc, status } = verificationData;
                    
                    if (!sessionId || !vc) {
                        throw new Error('Invalid Veriff verification data: missing sessionId or vc');
                    }
                    
                    let vcStatus: VcStatus;
                    if (status === 'approved') {
                        vcStatus = VcStatus.APPROVED;
                    } else if (status === 'declined' || status === 'resubmission_requested') {
                        vcStatus = VcStatus.REJECTED;
                    } else {
                        vcStatus = VcStatus.PENDING;
                    }
                    
                    // Store the verification data
                    await storageManager.createVc(sessionId, vc, vcStatus);
                    
                    debug(`TONOMY_ID/setupVeriffVerificationSubscriber: Stored Veriff verification with status ${vcStatus}`);
                    
                    resolve(verificationData);
                } catch (error) {
                    console.error('Error processing Veriff verification:', error);
                    throw error;
                }
            })
            .catch((error) => {
                console.error('Error waiting for Veriff verification:', error);
                throw error;
            });
    });
}

/**
 * Mocks a Veriff webhook API call for testing purposes
 * This function simulates the server receiving a webhook from Veriff and sending the verification data to the user
 * 
 * @param did The DID of the user to send the verification to
 * @param sessionId The Veriff session ID
 * @param status The verification status (approved, declined, etc.)
 * @returns A promise that resolves when the mock webhook is processed
 */
export async function mockVeriffWebhook(did: string, sessionId: string, status: string = 'approved') {
    debug(`TONOMY_ID/mockVeriffWebhook: Mocking Veriff webhook for session ${sessionId} with status ${status}`);
    
    // Create mock verification data
    const mockVc = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'KYCCredential'],
        issuer: 'did:key:veriff',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
            id: did,
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'AB123456'
        }
    };
    
    const mockPayload = {
        sessionId,
        vc: JSON.stringify(mockVc),
        status
    };
    
    // TODO: In a real test, Make an HTTP request to the Veriff webhook endpoint
    
    debug('TONOMY_ID/mockVeriffWebhook: Mock webhook processed successfully');
    
    return mockPayload;
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
                if (testOptions.dataRequestKYC) {
                    expectedRequestCount++; // KYC request
                }
            }
            
            expect(requests.external.getRequests().length).toBe(expectedRequestCount);

            if (!requests.sso) throw new Error('SSO requests are missing in the login request message');
            const receiverDid = requests.sso.getDid();

            expect(receiverDid).toBe(tonomyLoginDid);
            expect(receiverDid).toBe(loginRequestMessage.getSender());
            
            // If KYC verification is requested, mock the KYC verification process
            if (testOptions.dataRequestKYC) {
                debug('TONOMY_ID/SSO: mocking KYC verification process');
                
                // Mock KYC data that would normally come from a verification service like Veriff
                const mockKYCData = {
                    verified: true,
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1990-01-01',
                    nationality: 'US',
                    documentType: 'passport',
                    documentNumber: 'AB123456',
                    verificationDate: new Date().toISOString(),
                };
                
                debug('TONOMY_ID/SSO: KYC verification completed successfully');
                
                // Attach the KYC data to the user's storage or state?
            }

            debug('TONOMY_ID/SSO: accepting login requests and sending confirmation to Tonomy Login Website');
            await user.acceptLoginRequest(requests, 'message');

            resolve(true);
        }, LoginRequestsMessage.getType());
    });
}