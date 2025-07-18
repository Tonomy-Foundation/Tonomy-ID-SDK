import { Repository, DataSource } from 'typeorm';
import { IdentityVerificationStorage } from './entities/identityVerificationStorage';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { ProviderEnum } from '../types/ProviderEnum';
import { VCTypeEnum } from '../types/VCTypeEnum';

export class IdentityVerificationStorageRepository {
    private ormRepository: Repository<IdentityVerificationStorage>;

    constructor(dataSource: DataSource) {
        this.ormRepository = dataSource.getRepository(IdentityVerificationStorage);
    }

    public async create(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: string
    ): Promise<IdentityVerificationStorage> {
        const now = new Date();
        const appStorageEntity = this.ormRepository.create({
            sessionId,
            vc,
            status,
            type,
            provider: ProviderEnum.VERIFF,
            vcType: VCTypeEnum.VERIFFv1,
            version: 1,
            createdAt: now,
            updatedAt: now,
        });

        return this.ormRepository.save(appStorageEntity);
    }

    public async findLatestWithStatus(
        type: VerificationTypeEnum,
        status: VeriffStatusEnum
    ): Promise<IdentityVerificationStorage | null> {
        return await this.ormRepository.findOne({
            where: { status, type },
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
        sessionId: string,
        type: VerificationTypeEnum
    ): Promise<IdentityVerificationStorage | null> {
        return await this.ormRepository.findOne({
            where: {
                sessionId: sessionId,
                type: type,
            },
        });
    }

    public async findLatestWithTypeAndStatus(
        type: VerificationTypeEnum,
        status: VeriffStatusEnum
    ): Promise<IdentityVerificationStorage | null> {
        return await this.ormRepository.findOne({
            where: {
                type: type,
                status: status,
            },
            order: {
                updatedAt: 'DESC',
            },
        });
    }
}
