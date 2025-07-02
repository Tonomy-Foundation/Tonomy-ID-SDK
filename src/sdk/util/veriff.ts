import { VerifiableCredentialWithType } from '.';

export type DocumentField = {
    confidenceCategory?: 'high' | 'medium' | 'low' | null;
    value: string | null;
    sources?: ('VIZ' | 'MRZ' | 'NFC' | 'BARCODE')[];
};

export type KYCVC = VerifiableCredentialWithType<VeriffWebhookPayload>;
export type FirstNameVC = VerifiableCredentialWithType<{ firstName: string }>;
export type LastNameVC = VerifiableCredentialWithType<{ lastName: string }>;
export type BirthDateVC = VerifiableCredentialWithType<{ dateOfBirth: string }>;
export type NationalityVC = VerifiableCredentialWithType<{ nationality: string }>;

// TODO: rename to VerificationMessagePayload
export type FullKycObject = {
    kyc: KYCVC;
    firstName?: FirstNameVC;
    lastName?: LastNameVC;
    birthDate?: BirthDateVC;
    nationality?: NationalityVC;
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
