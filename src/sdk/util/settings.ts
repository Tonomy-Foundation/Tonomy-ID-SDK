'use strict';
import { SdkErrors, throwError } from './errors';

if (typeof Proxy === 'undefined') {
    throw new Error("This browser doesn't support Proxy");
}

export type LoggerLevel = 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';

export type SettingsType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    consoleWebsiteOrigin: string;
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

    const proxy = new Proxy(settings, {
        get(target, name, receiver) {
            if (Reflect.has(target, name)) {
                return Reflect.get(target, name, receiver);
            }

            throw new Error(
                `Tonomy SDK settings has not been initialized using setSettings() with property for variable: ${name.toString()}`
            );
        },
    });

    return proxy;
}

export function isProduction(): boolean {
    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }

    return ['production', 'staging', 'testnet'].includes(settings.environment);
}
