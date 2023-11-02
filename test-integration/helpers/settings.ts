import { SettingsType } from '../../src/sdk/index';
import { setSettings } from '../../src/sdk/util/settings';

export const settings: Partial<SettingsType> = {
    blockchainUrl: 'http://localhost:8888',
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-test://',
    loggerLevel: 'info',
};

export function setTestSettings(debugLogger = false) {
    if (debugLogger) {
        settings.loggerLevel = 'debug';
    }

    setSettings(settings);
}
