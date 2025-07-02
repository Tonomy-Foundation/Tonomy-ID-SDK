import { VerifiableCredentialWithType } from './ssi/vc';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { KeyValueObject } from './objects';

export type KYCPayload = VeriffWebhookPayload;

export class KYCVC extends VerifiableCredentialWithType<KYCPayload> {
    protected static type = 'KYCVC';
}
export class FirstNameVC extends VerifiableCredentialWithType<{ firstName: string }> {
    protected static type = 'FirstNameVC';
}
export class LastNameVC extends VerifiableCredentialWithType<{ lastName: string }> {
    protected static type = 'LastNameVC';
}
export class BirthDateVC extends VerifiableCredentialWithType<{ dateOfBirth: string }> {
    protected static type = 'BirthDateVC';
}
export class AddressVC extends VerifiableCredentialWithType<{ address: string; components: KeyValueObject }> {
    protected static type = 'AddressVC';
}
export class NationalityVC extends VerifiableCredentialWithType<{ nationality: string }> {
    protected static type = 'NationalityVC';
}

export type PersonCredentialType = KYCVC | FirstNameVC | LastNameVC | BirthDateVC | AddressVC | NationalityVC;

export type VerificationMessagePayload = {
    kyc: KYCVC;
    firstName?: FirstNameVC;
    lastName?: LastNameVC;
    birthDate?: BirthDateVC;
    address?: AddressVC;
    nationality?: NationalityVC;
};

export type DocumentField = {
    confidenceCategory?: 'high' | 'medium' | 'low' | null;
    value: string | null;
    sources?: ('VIZ' | 'MRZ' | 'NFC' | 'BARCODE')[];
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
                firstName?: PersonField;
                lastName?: PersonField;
                dateOfBirth?: PersonField;
                gender?: PersonField;
                idNumber?: PersonField;
                nationality?: PersonField;
                address?: AddressField;
                placeOfBirth?: PersonField;
                foreignerStatus?: PersonField;
                occupation?: PersonField;
                employer?: PersonField;
                extraNames?: PersonField;
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
        case VerificationTypeEnum.LASTNAME:
            return new LastNameVC(vc);
        case VerificationTypeEnum.BIRTHDATE:
            return new BirthDateVC(vc);
        case VerificationTypeEnum.ADDRESS:
            return new AddressVC(vc);
        case VerificationTypeEnum.NATIONALITY:
            return new NationalityVC(vc);
        default:
            throw new Error(`type ${type} not valid`);
    }
}
