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
import { createUser } from '../../src/cli/bootstrap/user';
import { DIDurl } from '../../src/sdk/util/ssi/types';
import { generateRandomKeywords } from '../../src/sdk/util';
import { ExternalUserLoginTestOptions } from '../externalUser.integration.test';
import { getTonomyOperationsKey } from '../../src/sdk/services/blockchain/eosio/eosio';
import { createSigner } from '../../src/sdk/services/blockchain';

// Using require for modules that might not have TypeScript definitions
import Debug from 'debug';
import { setupDatabase } from '../../src/setup';

const debug = Debug('tonomy-sdk-tests:helpers:user');

export interface IUserPublic extends IUser {
    keyManager: KeyManager;
    storage: IUserStorage;
    communication: Communication;
}

export async function createUserObject(keyManager: KeyManager, storageFactory: StorageFactory): Promise<IUserPublic> {
    const dataSource = await setupDatabase();

    return new User(keyManager, storageFactory, dataSource) as unknown as IUserPublic;
}

export const HCAPCHA_CI_RESPONSE_TOKEN = '10000000-aaaa-bbbb-cccc-000000000001';

export { createUser };

export async function createRandomID(checkKeys = true) {
    const auth: KeyManager = new JsKeyManager();
    const user = await createUserObject(auth, jsStorageFactory);

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

/**
 * Mocks a Veriff webhook API call for testing purposes
 * This function simulates the server receiving a webhook from Veriff and sending the verification data to the user
 *
 * @param did The DID of the user to send the verification to
 * @param sessionId The Veriff session ID
 * @param status The verification status (approved, declined, etc.)
 * @returns A promise that resolves with the stringified payload that matches what the Communication Gateway would send
 */
export async function mockVeriffWebhook(did: string, sessionId: string, status: string = 'approved') {
    debug(`TONOMY_ID/mockVeriffWebhook: Mocking Veriff webhook for session ${sessionId} with status ${status}`);

    // Create mock verification data that matches the VeriffWebhookPayload structure
    const mockData = {
        verification: {
            decision: status,
            decisionScore: 100,
            person: {
                firstName: {
                    value: 'John',
                    confidenceCategory: 'high',
                },
                lastName: {
                    value: 'Doe',
                    confidenceCategory: 'high',
                },
                dateOfBirth: {
                    value: '1990-01-01',
                    confidenceCategory: 'high',
                },
                nationality: {
                    value: 'US',
                    confidenceCategory: 'high',
                },
            },
            document: {
                type: {
                    value: 'passport',
                    confidenceCategory: 'high',
                },
                country: {
                    value: 'US',
                    confidenceCategory: 'high',
                },
                number: {
                    value: 'AB123456',
                    confidenceCategory: 'high',
                },
            },
            insights: null,
        },
    };

    // Create mock signed JWTs for each credential
    // In a real scenario, these would be signed by the Tonomy issuer
    // For testing, we'll create mock JWT strings that follow the same format

    // Mock JWT for the main KYC credential
    const mockKycJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'VeriffCredential'],
                credentialSubject: {
                    id: did,
                    data: mockData,
                },
            },
        })
    )}.mockSignature`;

    // Mock JWT for the decision credential
    const mockDecisionJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'DecisionCredential'],
                credentialSubject: {
                    id: did,
                    decision: status,
                },
            },
        })
    )}.mockSignature`;

    // Mock JWT for firstName credential
    const mockFirstNameJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'FirstNameCredential'],
                credentialSubject: {
                    id: did,
                    firstName: mockData.verification.person.firstName.value,
                },
            },
        })
    )}.mockSignature`;

    // Mock JWT for lastName credential
    const mockLastNameJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'LastNameCredential'],
                credentialSubject: {
                    id: did,
                    lastName: mockData.verification.person.lastName.value,
                },
            },
        })
    )}.mockSignature`;

    // Mock JWT for birthDate credential
    const mockBirthDateJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'BirthDateCredential'],
                credentialSubject: {
                    id: did,
                    birthDate: mockData.verification.person.dateOfBirth.value,
                },
            },
        })
    )}.mockSignature`;

    // Mock JWT for nationality credential
    const mockNationalityJwt = `eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.${btoa(
        JSON.stringify({
            vc: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential', 'NationalityCredential'],
                credentialSubject: {
                    id: did,
                    nationality: mockData.verification.person.nationality.value,
                },
            },
        })
    )}.mockSignature`;

    // Create the payload that matches what the Communication Gateway would send

    const payload = JSON.stringify({
        kyc: mockKycJwt,
        decision: mockDecisionJwt,
        firstName: mockFirstNameJwt,
        lastName: mockLastNameJwt,
        birthDate: mockBirthDateJwt,
        nationality: mockNationalityJwt,
    });

    debug('TONOMY_ID/mockVeriffWebhook: Mock webhook processed successfully');

    return payload;
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

                // Simulate Veriff webhook call
                const userDid = await user.getDid();
                const sessionId = randomString(32);
                const mockWebhookData = await mockVeriffWebhook(userDid, sessionId);

                // Simulate the Communication server sending the verification data to the user
                // In a real scenario, this would happen via the webhook endpoint
                // For testing, we directly emit the event to the user's socket
                debug('TONOMY_ID/SSO: Emitting verification data via socket event');

                // Manually trigger the event with the mock data
                user.communication.socketServer.emit('/v1/verification/veriff/receive', mockWebhookData);

                debug('TONOMY_ID/SSO: KYC verification completed successfully');
            }

            debug('TONOMY_ID/SSO: accepting login requests and sending confirmation to Tonomy Login Website');
            await user.acceptLoginRequest(requests, 'message');

            resolve(true);
        }, LoginRequestsMessage.getType());
    });
}
