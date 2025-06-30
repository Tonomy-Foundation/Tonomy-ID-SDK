/* eslint-disable indent */
import { Entity, Unique, Column, Index, PrimaryColumn } from 'typeorm';
import { VeriffStatusEnum } from '../../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../../types/VerificationTypeEnum';

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
        default: VeriffStatusEnum.PENDING,
    })
    status!: VeriffStatusEnum;

    @Column({ type: 'int' })
    version!: number;

    @Column({ type: 'datetime' })
    createdAt!: Date;

    @Column({ type: 'datetime' })
    @Index()
    updatedAt!: Date;

    @Column({
        type: 'varchar',
        enum: VerificationTypeEnum,
        default: VerificationTypeEnum.KYC,
    })
    @Index()
    type!: VerificationTypeEnum;
}
