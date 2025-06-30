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
        vc: string,
        status: VeriffStatusEnum,
        type: VerificationTypeEnum
    ): Promise<IdentityVerificationStorage> {
        const now = new Date();
        const appStorageEntity = this.ormRepository.create({
            veriffId,
            vc,
            status,
            type,
            version: 1,
            createdAt: now,
            updatedAt: now,
        });

        return this.ormRepository.save(appStorageEntity);
    }

    public async findByVeriffId(veriffId: string): Promise<IdentityVerificationStorage | null> {
        const doc = this.ormRepository.findOne({ where: { veriffId } });

        return doc;
    }

    public async findLatestApproved(type: VerificationTypeEnum): Promise<IdentityVerificationStorage | null> {
        const doc = await this.ormRepository.findOne({
            where: { status: VeriffStatusEnum.APPROVED, type },
            order: { createdAt: 'DESC' },
        });

        return doc;
    }

    public async deleteAll(): Promise<void> {
        await this.ormRepository.delete({});
    }

    public async update(identityVerification: IdentityVerificationStorage): Promise<IdentityVerificationStorage> {
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
