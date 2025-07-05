import { Repository, DataSource } from 'typeorm';
import { IdentityVerificationStorage } from './entities/identityVerificationStorage';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:storage:IdentityVerificationStorageRepository');

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

        const doc = await this.ormRepository.save(appStorageEntity);

        // await this.printAllTrimmed('create()');
        return doc;
    }

    public async findLatestWithStatus(
        type: VerificationTypeEnum,
        status: VeriffStatusEnum
    ): Promise<IdentityVerificationStorage | null> {
        // await this.printAllTrimmed('findLatestWithStatus()');
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
        const doc = await this.ormRepository.save(identityVerification);

        // await this.printAllTrimmed('update()');
        return doc;
    }

    public async findByIdAndType(
        veriffId: string,
        type: VerificationTypeEnum
    ): Promise<IdentityVerificationStorage | null> {
        return this.ormRepository.findOne({
            where: { veriffId, type },
        });
    }

    public async findAll(): Promise<IdentityVerificationStorage[]> {
        return await this.ormRepository.find();
    }

    private async printAllTrimmed(context: string): Promise<void> {
        const all = await this.findAll();

        debug(
            `${context}.printAllTrimmed()`,
            all.map((item) => ({
                ...item,
                vc: item.vc.slice(0, 10) + '...',
            }))
        );
    }
}
