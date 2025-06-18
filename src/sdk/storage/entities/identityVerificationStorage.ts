/* eslint-disable indent */
import { Entity, Unique, Column, Index, PrimaryColumn } from 'typeorm';

export enum VcStatus {
    APPROVED = 'APPROVED',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    DECLINED = 'DECLINED',
}

export enum VerificationType {
    KYC = 'kyc',
    FIRST_NAME = 'firstname',
    LAST_NAME = 'lastname',
    EMAIL = 'email',
    PHONE = 'phone',
    ADDRESS = 'address',
    DOB = 'dob',
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
        type: 'enum',
        enum: VcStatus,
        default: VcStatus.PENDING,
    })
    status!: string;

    @Column({ type: 'int' })
    version!: number;

    @Column({ type: 'datetime' })
    createdAt!: Date;

    @Column({ type: 'datetime' })
    updatedAt!: Date;

    @Column({
        type: 'enum',
        enum: VerificationType,
        default: VerificationType.KYC,
    })
    type!: VerificationType;
}
