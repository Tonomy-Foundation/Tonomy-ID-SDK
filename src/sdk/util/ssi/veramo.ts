import { DataSource } from 'typeorm';
import { Wallet } from 'ethers';
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';
import { KeyManager } from '@veramo/key-manager';
import { Entities, KeyStore, migrations, PrivateKeyStore } from '@veramo/data-store';

export async function veramo() {
    console.log('testing Veramo libraries');
    const DATABASE_FILE = 'database.sqlite';
    const dbConnection = new DataSource({
        type: 'sqlite',
        database: DATABASE_FILE,
        synchronize: false,
        migrations,
        migrationsRun: true,
        logging: ['error', 'info', 'warn'],
        entities: Entities,
    }).initialize();

    const DB_ENCRYPTION_KEY = 'test';

    const kid = 'testing';
    const key = Wallet.createRandom().privateKey;
    const keyManager = new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
            local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(DB_ENCRYPTION_KEY))),
        },
    });

    keyManager.keyManagerCreate({ type: 'Secp256k1', kms: 'local', meta: { encryption: ['ECDH-ES'] } });
    keyManager.keyManagerImport({ type: 'Secp256k1', kms: 'local', privateKeyHex: key, kid });
}