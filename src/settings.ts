import { SdkErrors, throwError } from './services/errors';

export type SettingsType = {
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    accountSuffix: string;
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
