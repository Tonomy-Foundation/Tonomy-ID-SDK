import { createAgent, IDIDManager, IResolver, IDataStore, IDataStoreORM, IKeyManager } from '@veramo/core';
import { DIDManager, MemoryDIDStore } from '@veramo/did-manager';
import { KeyManager } from '@veramo/key-manager';
import { KeyManagementSystem } from '@veramo/kms-local';
// import { CredentialPlugin } from '@veramo/credential-w3c';
import { DIDResolverPlugin } from '@veramo/did-resolver';
import { Resolver } from 'did-resolver';
import { getDidKeyResolver, KeyDIDProvider } from '@veramo/did-provider-key';
import { MemoryKeyStore, MemoryPrivateKeyStore } from '@veramo/key-manager';

// Using key-value storage
export const privateKeyStore = new MemoryPrivateKeyStore();

export const keyManager = new KeyManager({
    store: new MemoryKeyStore(),
    kms: {
        local: new KeyManagementSystem(privateKeyStore),
    },
});

export const didManager = new DIDManager({
    store: new MemoryDIDStore(),
    defaultProvider: 'did:key',
    providers: {
        'did:key': new KeyDIDProvider({
            defaultKms: 'local',
        }),
    },
});

export const didResolver = new DIDResolverPlugin({
    resolver: new Resolver({
        ...getDidKeyResolver(),
    }),
});

// export const credentials = new CredentialPlugin();

export const agent = createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver>({
    plugins: [keyManager, didManager, didResolver],
});

export function createDidKeyAgent() {
    return createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver>({
        plugins: [keyManager, didManager, didResolver],
    });
}
