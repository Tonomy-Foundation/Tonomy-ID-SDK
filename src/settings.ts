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
        throw new Error('settings not yet intialized');
    }
    return settings;
}
