import { VerifiableCredentialWithType } from '.';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { KeyValueObject } from './objects';

export type DocumentField = {
    confidenceCategory?: 'high' | 'medium' | 'low' | null;
    value: string | null;
    sources?: ('VIZ' | 'MRZ' | 'NFC' | 'BARCODE')[];
};

export type KYCPayload = VeriffWebhookPayload;

export type KYCVC = VerifiableCredentialWithType<KYCPayload>;
export type FirstNameVC = VerifiableCredentialWithType<{ firstName: string }>;
export type LastNameVC = VerifiableCredentialWithType<{ lastName: string }>;
export type BirthDateVC = VerifiableCredentialWithType<{ dateOfBirth: string }>;
export type AddressVC = VerifiableCredentialWithType<{ address: KeyValueObject }>;
export type NationalityVC = VerifiableCredentialWithType<{ nationality: string }>;

export type PersonCredentialType = KYCVC | FirstNameVC | LastNameVC | BirthDateVC | NationalityVC;

export type VerificationMessagePayload = {
    kyc: KYCVC;
    firstName?: FirstNameVC;
    lastName?: LastNameVC;
    birthDate?: BirthDateVC;
    address?: AddressVC;
    nationality?: NationalityVC;
};

export type PersonField = DocumentField | null;
export type AddressField = (DocumentField & { components?: KeyValueObject }) | null;

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
                firstName: PersonField;
                lastName: PersonField;
                dateOfBirth: PersonField;
                gender: PersonField;
                idNumber: PersonField;
                nationality: PersonField;
                address: AddressField;
                placeOfBirth: PersonField;
                foreignerStatus: PersonField;
                occupation: PersonField;
                employer: PersonField;
                extraNames: PersonField;
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
                firstIssue?: DocumentField;
                placeOfIssue?: DocumentField;
                processNumber?: DocumentField;
                residencePermitType?: DocumentField;
                licenseNumber?: DocumentField;
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

export function castDecisionToStatus(decision: string): VeriffStatusEnum {
    switch (decision) {
        case 'approved':
            return VeriffStatusEnum.APPROVED;
        case 'declined':
            return VeriffStatusEnum.DECLINED;
        case 'resubmission_requested':
            return VeriffStatusEnum.DECLINED;
        case 'expired':
            return VeriffStatusEnum.DECLINED;
        case 'abandoned':
            return VeriffStatusEnum.DECLINED;
        default:
            throw new Error(`Unknown decision: ${decision}`);
    }
}

export function castStringToCredential(vc: string, type: VerificationTypeEnum): PersonCredentialType {
    switch (type) {
        case VerificationTypeEnum.KYC:
            return new KYCVC(vc);
        case VerificationTypeEnum.FIRSTNAME:
            return new FirstNameVC(vc);
        case VerificationTypeEnum.FIRSTNAME:
            return new FirstNameVC(vc);
        case VerificationTypeEnum.LASTNAME:
            return new LastNameVC(vc);
        case VerificationTypeEnum.BIRTHDATE:
            return new BirthDateVC(vc);
        case VerificationTypeEnum.ADDRESS:
            return new AddressVc(vc);
        case VerificationTypeEnum.NATIONALITY:
            return new NationalityVC(vc);
        default:
            throw new Error(`type ${type} not valid`);
    }
}
