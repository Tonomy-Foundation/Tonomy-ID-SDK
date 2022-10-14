export type SettingsType = {
    blockchainUrl: string;
}

let settings: SettingsType;
let initialized = false;

export function setSettings(newSettings: SettingsType) {
    settings = newSettings;
    initialized = true;
}

export async function getSettings(): Promise<SettingsType> {
    while (!initialized) {
        "Waiting for settings to be initialized";
        await sleep(1000);
    }
    return settings;
}