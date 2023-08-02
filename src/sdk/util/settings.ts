import { SdkErrors, throwError } from './errors';

export type SettingsType = {
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    tonomyIdSchema: string;
    loggerLevel: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
};

let settings: SettingsType;
let initialized = false;

export function setSettings(newSettings: Partial<SettingsType>) {
    settings = newSettings as SettingsType;
    initialized = true;
}

export function getSettings(): SettingsType {
    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }

    return settings;
}
