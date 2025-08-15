import { IdentityVerificationStorageRepository } from './identityVerificationStorageRepository';
import { VeriffStatusEnum } from '../types/VeriffStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { DataSource } from 'typeorm';
import { castStringToCredential, PersonCredentialType } from '../util/veriff';

export class IdentityVerificationStorageManager {
    protected repository: IdentityVerificationStorageRepository;

    constructor(repository: IdentityVerificationStorageRepository | DataSource) {
        if (repository instanceof DataSource) {
            this.repository = new IdentityVerificationStorageRepository(repository);
        } else {
            this.repository = repository;
        }
    }

    async create(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        await this.repository.create(sessionId, type, status, vc.toString());
        return vc;
    }

    async findLatestApproved(type: VerificationTypeEnum): Promise<PersonCredentialType | null> {
        return await this.findLatestWithTypeAndStatus(type, VeriffStatusEnum.APPROVED);
    }

    async findLatestWithTypeAndStatus(
        type: VerificationTypeEnum,
        status: VeriffStatusEnum
    ): Promise<PersonCredentialType | null> {
        const doc = await this.repository.findLatestWithStatus(type, status);

        if (doc) {
            return castStringToCredential(doc.vc, type);
        } else return null;
    }

    async updateRecord(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        const doc = await this.repository.findByIdAndType(sessionId, type);

        if (doc) {
            doc.vc = vc.toString();
            doc.status = status;
            doc.reuseCount += 1;
            await this.repository.update(doc);
            return castStringToCredential(doc.vc, doc.type);
        } else {
            throw new Error('Record not found for update');
        }
    }

    async deleteAll(): Promise<void> {
        await this.repository.deleteAll();
    }

    async emplaceByVeriffIdAndType(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        const doc = await this.repository.findByIdAndType(sessionId, type);

        if (doc) {
            return this.updateRecord(sessionId, type, status, vc);
        } else {
            return this.create(sessionId, type, status, vc);
        }
    }

    async countReuse(type?: VerificationTypeEnum): Promise<number> {
        return await this.repository.findCountByType(type);
    }

    async updateReuseableCount(type: VerificationTypeEnum): Promise<void> {
        const doc = await this.repository.findByType(type);

        if (doc) {
            doc.reuseCount += 1;
            await this.repository.update(doc);
        }
    }
}
