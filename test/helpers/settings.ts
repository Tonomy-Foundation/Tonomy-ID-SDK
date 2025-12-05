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
    baseMintBurnAddress: process.env.BASE_TOKEN_ADDRESS,
    basePrivateKey: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', // Hardhat account #19
};

export function setTestSettings() {
    setSettings(settings);
    setFetch(fetch);
}
