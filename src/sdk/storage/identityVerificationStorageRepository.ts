import { Repository, DataSource } from 'typeorm';
import { IdentityVerificationStorage } from './entities/identityVerificationStorage';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';

export class IdentityVerificationStorageRepository {
    private ormRepository: Repository<IdentityVerificationStorage>;

    constructor(dataSource: DataSource) {
        this.ormRepository = dataSource.getRepository(IdentityVerificationStorage);
    }

    public async create(
        veriffId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: string
    ): Promise<IdentityVerificationStorage> {
        const now = new Date();
        const appStorageEntity = this.ormRepository.create({
            veriffId,
            type,
            status,
            vc,
            version: 1,
            createdAt: now,
            updatedAt: now,
        });

        return await this.ormRepository.save(appStorageEntity);
    }

    public async findLatestApproved(type: VerificationTypeEnum): Promise<IdentityVerificationStorage | null> {
        return await this.ormRepository.findOne({
            where: { status: VeriffStatusEnum.APPROVED, type },
            order: { createdAt: 'DESC' },
        });
    }

    public async deleteAll(): Promise<void> {
        await this.ormRepository.delete({});
    }

    public async update(identityVerification: IdentityVerificationStorage): Promise<IdentityVerificationStorage> {
        const now = new Date();

        identityVerification.updatedAt = now;
        return await this.ormRepository.save(identityVerification);
    }

    public async findByIdAndType(
        veriffId: string,
        type: VerificationTypeEnum
    ): Promise<IdentityVerificationStorage | null> {
        return this.ormRepository.findOne({
            where: { veriffId, type },
        });
    }
}
