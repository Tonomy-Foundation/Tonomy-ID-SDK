import { getSettings } from '../../util/settings';
import fetch from 'cross-fetch';
import { throwError } from '../../util';

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
    credentials: VeriffWebhookPayload
): Promise<{ verification: boolean; id: string }> {
    const url = getSettings().accountsServiceUrl;
    const decision = credentials.data.verification.decision;

    if (decision === 'approved') {
        const response = await fetch(`${url}/veriff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        const resData = await response.json();

        if (response.status !== 201) {
            if (response.status === 400) {
                return throwError('Veriff Service error: ' + resData.message + ', errors: ' + resData.errors);
            }

            throwError('Veriff Service error: ' + resData.message + ', status: ' + response.status);
        }

        return {
            verification: true,
            id: resData.id,
        };
    } else {
        throwError('Document verification failed: ' + decision);
    }
}
