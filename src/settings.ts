export type SettingsType = {
    blockchainUrl: string;
}

const defaultSettings: SettingsType = {
    blockchainUrl: "http://localhost:8888"
}

// singleton object approach
export class Settings {
    static _singleton_instance: Settings;
    settings: SettingsType;
    initialized = false;

    constructor(settings: SettingsType) {
        this.settings = settings;
    }

    public static get Instance() {
        return this._singleton_instance || (this._singleton_instance = new this(defaultSettings));
    }

    public getSettings(): SettingsType {
        return this.settings;
    }
}

// global variable approach
let settings: SettingsType = defaultSettings;

export function setSettings(newSettings: SettingsType) {
    settings = newSettings;
}

export function getSettings(): SettingsType {
    return settings;
}