import { copyObject, getSettings, VeriffWebhookPayload } from '../../src/sdk/util';
import * as crypto from 'crypto';

export const mockVeriffWebhookPayloadApproved: VeriffWebhookPayload = {
    status: 'success',
    eventType: 'fullauto',
    sessionId: 'test-session-id-123',
    attemptId: 'test-attempt-id-456',
    vendorData: null,
    endUserId: null,
    version: '1.0.0',
    acceptanceTime: '2025-07-02T19:28:27+02:00',
    time: '2025-07-02T19:28:27+02:00',
    data: {
        verification: {
            decisionScore: 95,
            decision: 'approved',
            person: {
                firstName: {
                    value: 'John',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                lastName: {
                    value: 'Doe',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                dateOfBirth: {
                    value: '1990-01-01',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                nationality: {
                    value: 'US',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                gender: {
                    value: 'M',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                idNumber: {
                    value: '123456789',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                address: {
                    value: '123 Main Street, Anytown, US',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                    components: {
                        streetAddress: '123 Main Street',
                        locality: 'Anytown',
                        country: 'US',
                    },
                },
                placeOfBirth: {
                    value: 'New York, US',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                extraNames: {
                    value: null,
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
            },
            document: {
                documentNumber: {
                    value: 'A12345678',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ', 'BARCODE'],
                },
                expiryDate: {
                    value: '2030-01-01',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
                issueDate: {
                    value: '2023-01-01',
                    confidenceCategory: 'high',
                    sources: ['VIZ', 'MRZ'],
                },
            },
            insights: [
                {
                    label: 'document_quality',
                    result: 'yes',
                    category: 'document_quality',
                },
                {
                    label: 'face_match',
                    result: 'yes',
                    category: 'face_match',
                },
                {
                    label: 'liveness',
                    result: 'yes',
                    category: 'liveness',
                },
            ],
        },
    },
};

const mockVeriffWebhookPayloadDeclined: VeriffWebhookPayload = copyObject<VeriffWebhookPayload>(
    mockVeriffWebhookPayloadApproved
);

mockVeriffWebhookPayloadDeclined.data.verification.decision = 'declined';
export { mockVeriffWebhookPayloadDeclined };

// Call the Veriff webhook, using authenticated data so it is verified and processed
export async function mockVeriffWebhook(payload: VeriffWebhookPayload) {
    const body = JSON.stringify(payload);
    const signature = createHmacSignature(payload);
    const headers = {
        'Content-Type': 'application/json',
        'x-hmac-signature': signature,
    };
    const url = getSettings().accountsServiceUrl + '/v1/veriff/webhook';

    await fetch(url, {
        method: 'POST',
        headers,
        body,
    });
}

function createHmacSignature(payload: VeriffWebhookPayload): string {
    const VERIFF_SECRET = process.env.VERIFF_SECRET || 'default_secret';

    return crypto.createHmac('sha256', VERIFF_SECRET).update(JSON.stringify(payload)).digest('hex');
}
