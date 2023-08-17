import { SettingsType } from '../../src/sdk/index';
import { setSettings } from '../../src/sdk/util/settings';

const settings: Partial<SettingsType> = {
    blockchainUrl: 'http://localhost:8888',
    accountSuffix: '.test.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomyid://',
};

export default settings;

export function setTestSettings() {
    setSettings(settings);
}
