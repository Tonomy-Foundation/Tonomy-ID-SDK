import { IdentityVerificationStorageRepository } from './identityVerificationStorageRepository';
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

    async create(
        veriffId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        await this.repository.create(veriffId, type, status, vc.toString());
        return vc;
    }

    async findLatestApproved(type: VerificationTypeEnum): Promise<PersonCredentialType | null> {
        const doc = await this.repository.findLatestApproved(type);

        if (doc) {
            return castStringToCredential(doc.vc, type);
        } else return null;
    }

    async updateRecord(
        veriffId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        const doc = await this.repository.findByIdAndType(veriffId, type);

        if (doc) {
            doc.vc = vc.toString();
            doc.status = status;
            await this.repository.update(doc);
            return castStringToCredential(doc.vc, doc.type);
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

    async emplaceByVeriffIdAndType(
        veriffId: string,
        type: VerificationTypeEnum,
        status: VeriffStatusEnum,
        vc: PersonCredentialType
    ): Promise<PersonCredentialType> {
        const doc = await this.repository.findByIdAndType(veriffId, type);

        if (doc) {
            doc.vc = vc.toString();
            doc.status = status;
            return this.updateRecord(veriffId, type, status, vc);
        } else {
            return this.create(veriffId, type, status, vc);
        }
    }
}
