import { VerifiableCredentialOptions, VerifiableCredentialWithType } from './ssi/vc';
import { VerificationStatusEnum } from '../types/VerificationStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { KeyValueObject } from './objects';
import { Issuer } from 'did-jwt-vc';

export type KYCPayload = VeriffWebhookPayload;

export class KYCVC extends VerifiableCredentialWithType<KYCPayload> {
    protected static type = 'KYCVC';

    /**
     * Alternative constructor that returns type KYCVC
     */
    static async signData(
        payload: KYCPayload,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<KYCVC> {
        const vc = await super.sign<KYCPayload>(payload, issuer, options);

        return new this(vc);
    }
}
export class FirstNameVC extends VerifiableCredentialWithType<{ firstName: string }> {
    protected static type = 'FirstNameVC';

    /**
     * Alternative constructor that returns type FirstNameVC
     */
    static async signData(
        payload: { firstName: string },
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<FirstNameVC> {
        const vc = await super.sign<{ firstName: string }>(payload, issuer, options);

        return new this(vc);
    }
}
export class LastNameVC extends VerifiableCredentialWithType<{ lastName: string }> {
    protected static type = 'LastNameVC';

    /**
     * Alternative constructor that returns type LastNameVC
     */
    static async signData(
        payload: { lastName: string },
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<LastNameVC> {
        const vc = await super.sign<{ lastName: string }>(payload, issuer, options);

        return new this(vc);
    }
}
export class BirthDateVC extends VerifiableCredentialWithType<{ birthDate: string }> {
    protected static type = 'BirthDateVC';

    /**
     * Alternative constructor that returns type BirthDateVC
     */
    static async signData(
        payload: { birthDate: string },
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<BirthDateVC> {
        const vc = await super.sign<{ birthDate: string }>(payload, issuer, options);

        return new this(vc);
    }
}

export type AddressVCType = { address: string; components?: KeyValueObject };
export class AddressVC extends VerifiableCredentialWithType<AddressVCType> {
    protected static type = 'AddressVC';

    /**
     * Alternative constructor that returns type AddressVC
     */
    static async signData(
        payload: AddressVCType,
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<AddressVC> {
        const vc = await super.sign<AddressVCType>(payload, issuer, options);

        return new this(vc);
    }
}
export class NationalityVC extends VerifiableCredentialWithType<{ nationality: string }> {
    protected static type = 'NationalityVC';

    /**
     * Alternative constructor that returns type NationalityVC
     */
    static async signData(
        payload: { nationality: string },
        issuer: Issuer,
        options: VerifiableCredentialOptions = {}
    ): Promise<NationalityVC> {
        const vc = await super.sign<{ nationality: string }>(payload, issuer, options);

        return new this(vc);
    }
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
                issuedBy?: DocumentField | null | undefined;
                firstIssue?: DocumentField | null | undefined;
                placeOfIssue?: DocumentField | null | undefined;
                processNumber?: DocumentField | null | undefined;
                residencePermitType?: DocumentField | null | undefined;
                licenseNumber?: DocumentField | null | undefined;
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

export function castDecisionToStatus(decision: string): VerificationStatusEnum {
    switch (decision) {
        case 'approved':
            return VerificationStatusEnum.APPROVED;
        case 'declined':
            return VerificationStatusEnum.DECLINED;
        case 'resubmission_requested':
            return VerificationStatusEnum.DECLINED;
        case 'expired':
            return VerificationStatusEnum.DECLINED;
        case 'abandoned':
            return VerificationStatusEnum.DECLINED;
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
