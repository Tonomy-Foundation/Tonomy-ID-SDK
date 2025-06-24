/* eslint-disable indent */
import { Entity, Unique, Column, Index, PrimaryColumn } from 'typeorm';

export const VcStatus = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DECLINED: 'DECLINED',
    PENDING: 'PENDING',
};

export type VcStatus = (typeof VcStatus)[keyof typeof VcStatus];

const statusMap: Record<string, VcStatus> = {
    APPROVED: VcStatus.APPROVED,
    REJECTED: VcStatus.REJECTED,
    DECLINED: VcStatus.DECLINED,
};

export function getStatusFromValue(status: string): VcStatus {
    return statusMap[status.toUpperCase()] ?? VcStatus.PENDING;
}

export const VerificationType = {
    KYC: 'KYC',
    FIRSTNAME: 'FIRSTNAME',
    LASTNAME: 'LASTNAME',
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
    ADDRESS: 'ADDRESS',
    DOB: 'DOB',
    NATIONALITY: 'NATIONALITY',
};

export type VerificationType = (typeof VerificationType)[keyof typeof VerificationType];

const keyMap: Record<string, VerificationType> = {
    kyc: VerificationType.KYC,
    address: VerificationType.ADDRESS,
    firstName: VerificationType.FIRSTNAME,
    lastName: VerificationType.LASTNAME,
    birthDate: VerificationType.DOB,
    nationality: VerificationType.NATIONALITY,
    email: VerificationType.EMAIL,
    phone: VerificationType.PHONE,
};

export function getVerificationKeyFromValue(key?: string | null): VerificationType | null {
    if (!key) return null;
    return keyMap[key] ?? null;
}

@Entity('IdentityVerificationStorage')
@Unique(['veriffId'])
export class IdentityVerificationStorage {
    @PrimaryColumn({
        unique: true,
        type: 'varchar',
    })
    @Index()
    veriffId!: string;

    @Column({ type: 'varchar' })
    vc!: string;

    @Column({
        type: 'varchar',
        default: VcStatus.PENDING,
    })
    status!: VcStatus;

    @Column({ type: 'int' })
    version!: number;

    @Column({ type: 'datetime' })
    createdAt!: Date;

    @Column({ type: 'datetime' })
    updatedAt!: Date;

    @Column({
        type: 'varchar',
        enum: VerificationType,
        default: VerificationType.KYC,
    })
    type!: VerificationType;
}
