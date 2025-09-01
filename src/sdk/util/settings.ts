'use strict';
import { SdkErrors, throwError } from './errors';
import Debug from 'debug';

const debug = Debug('tonomy-sdk:settings');

if (typeof Proxy === 'undefined') {
    throw new Error("This environment doesn't support Proxy");
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
    currencySymbol: string;
};

type FetchType = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

let settings: SettingsType;
let fetchFunction: FetchType;
let initialized = false;

export function setSettings(newSettings: Partial<SettingsType>): void {
    debug('Settings initialized', newSettings);
    settings = newSettings as SettingsType;
    initialized = true;
}

export function setFetch(fetch: FetchType): void {
    fetchFunction = fetch;
}

export function getFetch(): FetchType | undefined {
    return fetchFunction;
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
    debug('Checking if production for environment:', settings.environment);

    if (!initialized) {
        throwError('Settings not yet initialized', SdkErrors.SettingsNotInitialized);
    }

    return ['production', 'staging', 'testnet'].includes(settings.environment);
}
