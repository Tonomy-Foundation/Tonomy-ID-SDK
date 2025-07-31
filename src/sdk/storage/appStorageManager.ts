import { AppStorageRepository } from './appStorageRepository';
import { AppStorage } from './entities/appStorage';
import { DataSource } from 'typeorm';

export abstract class AppStorageManager {
    protected repository: AppStorageRepository;

    constructor(repository: AppStorageRepository | DataSource) {
        if (repository instanceof DataSource) {
            this.repository = new AppStorageRepository(repository);
        } else {
            this.repository = repository;
        }
    }

    async find(accountName: string): Promise<AppStorage | null> {
        const doc = await this.repository.findByAccountName(accountName);

        if (doc) {
            return doc;
        } else return null;
    }

    public async emplace(
        origin: string,
        accountName: string,
        dataShared: string,
        isLoggedIn?: boolean
    ): Promise<AppStorage> {
        const doc = await this.repository.findByAccountName(accountName);

        if (doc) return await this.repository.update(dataShared, doc);
        else {
            return await this.repository.create(origin, accountName, dataShared, isLoggedIn || false);
        }
    }
}
