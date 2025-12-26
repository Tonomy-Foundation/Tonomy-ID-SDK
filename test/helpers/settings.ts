import { config } from 'dotenv';
import { existsSync } from 'fs';
import { setFetch, setSettings, SettingsType } from '../../src/sdk/util/settings';
import fetch from 'cross-fetch';

if (existsSync('.env.test')) {
    config({ path: '.env.test', quiet: true });
}

export const settings: Partial<SettingsType> = {
    blockchainUrl: 'http://localhost:8888',
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-test://',
    loggerLevel: 'info',
    currencySymbol: 'TONO',
    environment: 'test',
    baseNetwork: 'localhost',
    baseRpcUrl: 'http://localhost:8545',
    baseTokenAddress: process.env.BASE_TOKEN_ADDRESS,
    baseMintBurnAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    basePrivateKey: '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0', // Hardhat account #19
};

export function setTestSettings() {
    setSettings(settings);
    setFetch(fetch);
}
