import { Repository, DataSource } from 'typeorm';
import { IdentityVerificationStorage, VcStatus, VerificationType } from './entities/identityVerificationStorage';

export class IdentityVerificationStorageRepository {
    private ormRepository: Repository<IdentityVerificationStorage>;

    constructor(dataSource: DataSource) {
        this.ormRepository = dataSource.getRepository(IdentityVerificationStorage);
    }

    public async create(
        veriffId: string,
        vc: string,
        status: VcStatus,
        type: VerificationType
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

    public async findLatestApproved(type: VerificationType): Promise<IdentityVerificationStorage | null> {
        const doc = await this.ormRepository.findOne({
            where: { status: 'APPROVED', type },
            order: { createdAt: 'DESC' },
        });

        return doc;
    }

    public async deleteAll(): Promise<void> {
        await this.ormRepository.delete({});
    }

    public async update(identityVerification: IdentityVerificationStorage): Promise<IdentityVerificationStorage> {
        const doc = await this.ormRepository.findOne({
            where: { veriffId: identityVerification.veriffId },
        });

        if (doc) return await this.ormRepository.save(identityVerification);
        else throw new Error('veriffId not exists ');
    }
}
