/* eslint-disable indent */
import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { VeriffStatusEnum } from '../../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../../types/VerificationTypeEnum';
import { ProviderEnum } from '../../types/ProviderEnum';
import { VCTypeEnum } from '../../types/VCTypeEnum';

@Entity('IdentityVerificationStorage')
export class IdentityVerificationStorage {
    @PrimaryColumn({ type: 'varchar' })
    @Index()
    sessionId!: string;

    @Column({ type: 'varchar' })
    vc!: string;

    @Column({
        type: 'varchar',
        enum: VeriffStatusEnum,
        default: VeriffStatusEnum.PENDING,
    })
    status!: VeriffStatusEnum;

    @Column({
        type: 'varchar',
        enum: VerificationTypeEnum,
        default: VerificationTypeEnum.KYC,
    })
    @Index()
    type!: VerificationTypeEnum;

    @Column({
        type: 'varchar',
        enum: ProviderEnum,
        default: ProviderEnum.VERIFF,
    })
    provider!: ProviderEnum;

    @Column({
        type: 'varchar',
        enum: VCTypeEnum,
        default: VCTypeEnum.VERIFFv1,
    })
    vcType!: VCTypeEnum;

    @Column({ type: 'int' })
    version!: number;

    @Column({ type: 'datetime' })
    createdAt!: Date;

    @Column({ type: 'datetime' })
    @Index()
    updatedAt!: Date;
}
