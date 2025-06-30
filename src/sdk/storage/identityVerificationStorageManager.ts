import { IdentityVerificationStorageRepository } from './identityVerificationStorageRepository';
import { IdentityVerificationStorage } from './entities/identityVerificationStorage';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';

export abstract class IdentityVerificationStorageManager {
    protected repository: IdentityVerificationStorageRepository;

    constructor(repository: IdentityVerificationStorageRepository) {
        this.repository = repository;
    }

    async createVc(veriffId: string, vc: string, status: VeriffStatusEnum, type: VerificationTypeEnum): Promise<void> {
        await this.repository.create(veriffId, vc, status, type);
    }

    async findLatestApproved(type: VerificationTypeEnum): Promise<IdentityVerificationStorage | null> {
        const doc = await this.repository.findLatestApproved(type);

        if (doc) {
            return doc;
        } else return null;
    }

    async updateRecord(identityVerification: IdentityVerificationStorage): Promise<void> {
        const doc = await this.repository.findByVeriffId(identityVerification.veriffId);

        if (doc) {
            doc.updatedAt = new Date();
            await this.repository.update(identityVerification);
        } else {
            throw new Error('Record not found for update');
        }
    }

    async deleteAll(): Promise<void> {
        await this.repository.deleteAll();
    }

    async findByVeriffIdAndType(
        veriffId: string,
        type: VerificationTypeEnum
    ): Promise<IdentityVerificationStorage | null> {
        const doc = await this.repository.findByIdAndType(veriffId, type);

        if (doc) {
            return doc;
        } else return null;
    }
}
