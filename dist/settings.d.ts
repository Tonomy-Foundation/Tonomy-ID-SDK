export declare type SettingsType = {
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
};
export declare function setSettings(newSettings: Partial<SettingsType>): void;
export declare function getSettings(): SettingsType;
