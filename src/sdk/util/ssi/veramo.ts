// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck veramo context argument breaks ts
import {
    createAgent,
    IDIDManager,
    IResolver,
    IDataStore,
    IDataStoreORM,
    IKeyManager,
    ICredentialPlugin,
    VerifiableCredential,
} from '@veramo/core';
import { DIDManager } from '@veramo/did-manager';
import { EthrDIDProvider } from '@veramo/did-provider-ethr';
import { KeyManager } from '@veramo/key-manager';
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local';
import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import { getResolver as ethrDidResolver } from 'ethr-did-resolver';
import { getResolver as webDidResolver } from 'web-did-resolver';
import { Entities, KeyStore, DIDStore, PrivateKeyStore, migrations } from '@veramo/data-store';
import type { DataSource } from 'typeorm';
import { Wallet } from 'ethers';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:util:ssi:veramo');

const DATABASE_FILE = '.database.sqlite.test';
const INFURA_PROJECT_ID = 'e19492ad3c7d409ca266f23af0a097d7';
const KMS_SECRET_KEY = 'a8add1db4f64e6117667708d261e6fd9f4de85209ba690ad254fa8ecb26ffe03';

type AgentType = IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialPlugin;

export let dbConnection: DataSource;

export async function setupDatabase(datasource?: DataSource) {
    debug('Setting up database');

    if (datasource) {
        debug('Using provided datasource');
        dbConnection = await datasource.initialize();
        return;
    }

    dbConnection = await new DataSource({
        type: 'sqlite',
        database: DATABASE_FILE,
        synchronize: false,
        migrations,
        migrationsRun: true,
        logging: ['error', 'info', 'warn'],
        entities: Entities,
    }).initialize();
}

export async function veramo() {
    debug('Running veramo');
    const agent = await setup();

    debug('Listing identifiers');
    await listIdentifiers(agent);
    await createIdentifier(agent);
    const verifiableCredential = await createCredential(agent);

    await verifyCredential(agent, verifiableCredential);
}

async function setup(): Promise<AgentType> {
    const agent = createAgent<AgentType>({
        plugins: [
            new KeyManager({
                store: new KeyStore(dbConnection),
                kms: {
                    local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))),
                },
            }),
            new DIDManager({
                store: new DIDStore(dbConnection),
                defaultProvider: 'did:ethr:goerli',
                providers: {
                    'did:ethr:goerli': new EthrDIDProvider({
                        defaultKms: 'local',
                        network: 'goerli',
                        rpcUrl: 'https://goerli.infura.io/v3/' + INFURA_PROJECT_ID,
                    }),
                },
            }),
            new DIDResolverPlugin({
                resolver: new Resolver({
                    ...ethrDidResolver({ infuraProjectId: INFURA_PROJECT_ID }),
                    ...webDidResolver(),
                }),
            }),
            new CredentialPlugin(),
        ],
    });

    return agent;
}

async function listIdentifiers(agent: AgentType) {
    const identifiers = await agent.didManagerFind({ alias: 'default' });

    debug(`There are ${identifiers.length} identifiers`);

    if (identifiers.length > 0) {
        identifiers.map((id) => {
            debug(id);
        });
    }
}

async function createIdentifier(agent: AgentType) {
    const identifier = await agent.didManagerCreate({ alias: 'default' });

    debug(`New identifier created`, identifier.did);
    debug(JSON.stringify(identifier, null, 2));
}

async function createCredential(agent: AgentType): Promise<VerifiableCredential> {
    const identifier = await agent.didManagerGetByAlias({ alias: 'default' });
    const verifiableCredential = await agent.createVerifiableCredential({
        credential: {
            issuer: { id: identifier.did },
            credentialSubject: {
                id: 'did:web:example.com',
                you: 'Rock',
            },
        },
        proofFormat: 'jwt',
    });

    debug(`New credential created`, verifiableCredential.id);
    debug(JSON.stringify(verifiableCredential, null, 2));
    return verifiableCredential;
}

async function verifyCredential(agent: AgentType, verifiableCredential: VerifiableCredential) {
    const result = await agent.verifyCredential({ credential: verifiableCredential });

    debug(`Credential verified`, result.verified);
}

export async function veramo2() {
    const kid = 'testing';
    const key = Wallet.createRandom().privateKey;

    debug('Creating key', kid, key);
    const keyManager = new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
            local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))),
        },
    });

    debug('Setup for key import');
    keyManager.keyManagerCreate({ type: 'Secp256k1', kms: 'local', meta: { encryption: ['ECDH-ES'] } });
    debug('Importing key');
    keyManager.keyManagerImport({ type: 'Secp256k1', kms: 'local', privateKeyHex: key, kid });
}
