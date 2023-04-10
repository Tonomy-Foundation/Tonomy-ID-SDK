// SDK
import * as Eosio from './services/eosio/eosio';
import * as Transaction from './services/eosio/transaction';

export * from './services/keymanager';
export * from './services/storage';
export * from './user';
export * from './userApps';
export * from './app';

export * from './settings';
export * from './services/eosio/authority';
export * from './util/crypto';
export * from './services/username';

const EosioUtil = { ...Eosio, ...Transaction };

export { EosioUtil };

export * from './services/contracts/IDContract';
export * from './services/contracts/EosioContract';
export * from './services/contracts/EosioTokenContract';

export * from './services/errors';
export * from './userApps';
export * from './communication';
export * from './util/message';
export * from './managers/browserStorage';
export * from './managers/jsKeyManager';

export { createSigner } from '@tonomy/antelope-ssi-toolkit';
export { ES256KSigner } from '@tonomy/did-jwt';

// API
export * from '../api/index';
