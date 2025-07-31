import { Repository, DataSource } from 'typeorm';
import { AppStorage } from './entities/appStorage';

export class AppStorageRepository {
    private ormRepository: Repository<AppStorage>;

    constructor(dataSource: DataSource) {
        this.ormRepository = dataSource.getRepository(AppStorage);
    }

    public async create(
        origin: string,
        accountName: string,
        dataShared: string,
        isLoggedIn: boolean
    ): Promise<AppStorage> {
        const now = new Date();
        const appStorageEntity = this.ormRepository.create({
            origin,
            accountName,
            dataShared,
            isLoggedIn,
            createdAt: now,
            updatedAt: now,
        });

        return this.ormRepository.save(appStorageEntity);
    }

    public async update(dataShared: string, appStorage: AppStorage): Promise<AppStorage> {
        const now = new Date();

        appStorage.updatedAt = now;
        appStorage.dataShared = dataShared;
        return this.ormRepository.save(appStorage);
    }

    public async findByAccountName(accountName: string): Promise<AppStorage | null> {
        const doc = this.ormRepository.findOne({ where: { accountName } });

        return doc;
    }
}
