import { SettingsType } from '../../src/sdk/index';
import { setFetch, setSettings } from '../../src/sdk/util/settings';
import fetch from 'cross-fetch';

export const settings: Partial<SettingsType> = {
    blockchainUrl: 'http://localhost:8888',
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-test://',
    loggerLevel: 'info',
    currencySymbol: 'TONO',
    environment: 'test',
};

export function setTestSettings() {
    setSettings(settings);
    setFetch(fetch);
}
