// SDK
import * as Eosio from './services/blockchain/eosio/eosio';
import * as Transaction from './services/blockchain/eosio/transaction';

export * from './storage/keymanager';
export * from './storage/storage';
export * from './controllers/user';
export * from './controllers/userApps';
export * from './controllers/app';

export * from './util/settings';
export * from './services/blockchain/eosio/authority';
export * from './util/crypto';
export * from './util/username';

const EosioUtil = { ...Eosio, ...Transaction };

export { EosioUtil };

export * from './services/blockchain/contracts/IDContract';
export * from './services/blockchain/contracts/EosioContract';
export * from './services/blockchain/contracts/EosioTokenContract';

export * from './util/errors';
export * from './controllers/userApps';
export * from './services/communication/communication';
export * from './services/communication/message';
export * from './storage/browserStorage';
export * from './storage/jsKeyManager';

export { createSigner } from '@tonomy/antelope-ssi-toolkit';
export { ES256KSigner } from '@tonomy/did-jwt';

export * from '../api/externalUser';

// API
export * from '../api/index';
