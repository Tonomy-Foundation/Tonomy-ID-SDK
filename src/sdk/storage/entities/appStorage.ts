/* eslint-disable indent */
import { Entity, Column, Index, PrimaryColumn } from 'typeorm';

@Entity('AppStorage')
export class AppStorage {
    @PrimaryColumn({ type: 'varchar', unique: true })
    accountName!: string;

    @Column({ type: 'varchar', unique: true })
    @Index()
    origin!: string;

    @Column({ type: 'bool' })
    isLoggedIn!: boolean;

    @Column({ type: 'varchar' })
    dataShared?: string;

    @Column({ type: 'int' })
    version!: number;

    @Column({ type: 'datetime' })
    createdAt!: Date;

    @Column({ type: 'datetime' })
    updatedAt!: Date;
}
