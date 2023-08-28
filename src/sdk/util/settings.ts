import { SdkErrors, throwError } from './errors';

export type LoggerLevel = 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';

export type SettingsType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    accountsServiceUrl: string;
    tonomyIdSchema: string;
    loggerLevel: LoggerLevel;
};

let settings: SettingsType;
let initialized = false;

export function setSettings(newSettings: Partial<SettingsType>) {
    if (newSettings.loggerLevel === 'debug') console.debug('setSettings', newSettings);
    settings = newSettings as SettingsType;
    initialized = true;
}

export function getSettings(): SettingsType {
    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }

    return settings;
}

export function isProduction(): boolean {
    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }

    return ['production', 'staging', 'demo'].includes(settings.environment);
}
