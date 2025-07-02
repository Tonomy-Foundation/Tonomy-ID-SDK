import { IdentityVerificationStorageRepository } from './identityVerificationStorageRepository';
import { IdentityVerificationStorage } from './entities/identityVerificationStorage';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { DataSource } from 'typeorm';
import { castStringToCredential, PersonCredentialType } from '../util';

export class IdentityVerificationStorageManager {
    protected repository: IdentityVerificationStorageRepository;

    constructor(repository: IdentityVerificationStorageRepository | DataSource) {
        if (repository instanceof DataSource) {
            this.repository = new IdentityVerificationStorageRepository(repository);
        } else {
            this.repository = repository;
        }
    }

    async createVc(
        veriffId: string,
        vc: PersonCredentialType,
        status: VeriffStatusEnum,
        type: VerificationTypeEnum
    ): Promise<void> {
        await this.repository.create(veriffId, vc.toString(), status, type);
    }

    async findLatestApproved(type: VerificationTypeEnum): Promise<PersonCredentialType | null> {
        const doc = await this.repository.findLatestApproved(type);

        if (doc) {
            return castStringToCredential(doc.vc, type);
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

    async findByVeriffIdAndType(veriffId: string, type: VerificationTypeEnum): Promise<PersonCredentialType | null> {
        const doc = await this.repository.findByIdAndType(veriffId, type);

        if (doc) {
            return castStringToCredential(doc.vc, type);
        } else return null;
    }
}
