import { SdkErrors, throwError } from './services/errors';

export type SettingsType = {
    blockchainUrl: string;
};

let settings: SettingsType;
let initialized = false;

export function setSettings(newSettings: SettingsType) {
    settings = newSettings;
    initialized = true;
}

export async function getSettings(): Promise<SettingsType> {
    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }
    return settings;
}
