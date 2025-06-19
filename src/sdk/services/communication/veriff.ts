import fetch from 'cross-fetch';
import { getSettings } from '../../util/settings';
import { DataSource } from 'typeorm';
import { IdentityVerificationStorageRepository } from '../../storage/identityVerificationStorageRepository';
import { VerificationType, VcStatus } from '../../storage/entities/identityVerificationStorage';

export type DocumentField = {
    confidenceCategory?: 'high' | 'medium' | 'low' | null;
    value: string | null;
    sources?: ('VIZ' | 'MRZ' | 'NFC' | 'BARCODE')[];
};

export type VeriffWebhookPayload = {
    status: 'success' | 'fail';
    eventType: 'fullauto';
    sessionId: string;
    attemptId: string;
    vendorData: string | null;
    endUserId: string | null;
    version: string;
    acceptanceTime: string;
    time: string;
    data: {
        verification: {
            decisionScore: number | null;
            decision: 'approved' | 'declined' | 'resubmission_requested' | 'expired' | 'abandoned';
            person: {
                [fieldName: string]: (DocumentField & { components?: any }) | null;
            };
            document: {
                type?:
                    | (DocumentField & {
                          value: string | null;
                      })
                    | null;
                country?: DocumentField | null;
                number?: DocumentField;
                validFrom?: DocumentField;
                validUntil?: DocumentField;
                issuedBy?: DocumentField;
                firstIssue?: any;
                placeOfIssue?: any;
                processNumber?: any;
                residencePermitType?: any;
                licenseNumber?: any;
                [extra: string]: DocumentField | null | undefined;
            };
            insights:
                | {
                      label: string;
                      result: 'yes' | 'likelyYes' | 'no' | 'notApplicable';
                      category: string;
                  }[]
                | null;
        };
    };
};

export async function receivingVerification(
    credentials: VeriffWebhookPayload,
    dataSource: DataSource
): Promise<{ verification: boolean }> {
    const repository = new IdentityVerificationStorageRepository(dataSource);
    const url = getSettings().accountsServiceUrl;
    const response = await fetch(`${url}/veriff`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    const resData = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to verify KYC: ${resData.message}`);
    }

    if (credentials.data.verification.decision === 'approved') {
        await repository.create(
            credentials.sessionId,
            JSON.stringify(credentials),
            VcStatus.APPROVED,
            VerificationType.KYC
        );

        // Create Verifiable Credentials for each verification type
        const verificationTypes = {
            [VerificationType.KYC]: credentials.data.verification.decision === 'approved',
            [VerificationType.DOB]: credentials.data.verification.person?.dateOfBirth?.value,
            [VerificationType.FIRST_NAME]: credentials.data.verification.person?.firstName?.value,
            [VerificationType.LAST_NAME]: credentials.data.verification.person?.lastName?.value,
            [VerificationType.EMAIL]: credentials.data.verification.person?.email?.value,
            [VerificationType.PHONE]: credentials.data.verification.person?.phone?.value,
            [VerificationType.ADDRESS]: credentials.data.verification.person?.address?.value,
        };

        for (const [type, value] of Object.entries(verificationTypes)) {
            if (value) {
                const vcData = {
                    id: `${credentials.sessionId}-${type}`,
                    type: [type as string],
                    credentialSubject: {
                        type: type as string,
                        value: value,
                        sessionId: credentials.sessionId,
                        status: credentials.data.verification.decision,
                        timestamp: new Date().toISOString(),
                    },
                };

                await repository.create(
                    `${credentials.sessionId}-${type}`,
                    JSON.stringify(vcData),
                    VcStatus.APPROVED,
                    type as VerificationType
                );
            }
        }

        return { verification: true };
    } else {
        return { verification: false };
    }
}
