import { IdentityVerificationStorageRepository } from './identityVerificationStorageRepository';
import { VerificationStatusEnum } from '../types/VerificationStatusEnum';
import { VerificationTypeEnum } from '../types/VerificationTypeEnum';
import { castStringToCredential, PersonCredentialType } from '../util/veriff';

export class IdentityVerificationStorageManager {
    protected repository: IdentityVerificationStorageRepository;

    constructor(repository: IdentityVerificationStorageRepository) {
        this.repository = repository;
    }

    async create(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VerificationStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        await this.repository.create(sessionId, type, status, vc.toString());
        return vc;
    }

    async findLatestApproved(type: VerificationTypeEnum): Promise<PersonCredentialType | null> {
        return await this.findLatestWithTypeAndStatus(type, VerificationStatusEnum.APPROVED);
    }

    async findLatestWithTypeAndStatus(
        type: VerificationTypeEnum,
        status: VerificationStatusEnum
    ): Promise<PersonCredentialType | null> {
        const doc = await this.repository.findLatestWithStatus(type, status);

        if (doc) {
            return castStringToCredential(doc.vc, type);
        } else return null;
    }

    async updateRecord(
        sessionId: string,
        type: VerificationTypeEnum,
        status: VerificationStatusEnum,
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
        status: VerificationStatusEnum,
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
