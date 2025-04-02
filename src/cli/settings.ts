import { ip } from 'address';
import { LoggerLevel } from '../sdk/util/settings';

// cannot use NODE_ENV as it is always "production" on `yarn run build`
const env = process.env.NODE_ENV || 'development';

type ConfigType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    demoWebsiteOrigin: string;
    consoleWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    accountsServiceUrl: string;
    tonomyIdSchema: string;
    loggerLevel: LoggerLevel;
    ecosystemName: string;
    currencySymbol: string;
};

const ipAddress = ip();

const defaultConfig = {
    environment: 'development',
    ssoWebsiteOrigin: `http://${ipAddress}:3000`,
    demoWebsiteOrigin: `http://${ipAddress}:3001`,
    consoleWebsiteOrigin: `http://${ipAddress}:3002`,
    blockchainUrl: `http://${ipAddress}:8888`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-development://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy - Development',
    currencySymbol: 'TONO',
};

const stagingConfig = {
    environment: 'staging',
    ssoWebsiteOrigin: `https://accounts.staging.tonomy.foundation`,
    demoWebsiteOrigin: `https://demo.staging.tonomy.foundation`,
    consoleWebsiteOrigin: `https://console.developers.staging.tonomy.foundation`,
    blockchainUrl: `https://blockchain-api-staging.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.staging.tonomy.foundation',
    accountsServiceUrl: 'http://communication.staging.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-staging://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy - Staging',
    currencySymbol: 'TONO',
};

const testnetConfig = {
    environment: 'testnet',
    ssoWebsiteOrigin: `https://accounts.testnet.tonomy.io`,
    demoWebsiteOrigin: `https://demo.testnet.tonomy.io`,
    consoleWebsiteOrigin: `https://console.developers.testnet.tonomy.io`,
    blockchainUrl: `https://blockchain-api-testnet.tonomy.io`,
    accountSuffix: '.testnet.pangea',
    communicationUrl: 'wss://communication.testnet.tonomy.io',
    accountsServiceUrl: 'http://communication.testnet.tonomy.io',
    tonomyIdSchema: 'pangea-testnet://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy Testnet',
    currencySymbol: 'TONO',
};

const productionConfig = {
    environment: 'production',
    ssoWebsiteOrigin: `https://accounts.tonomy.io`,
    demoWebsiteOrigin: `https://demo.tonomy.io`,
    consoleWebsiteOrigin: `https://console.developers.tonomy.io`,
    blockchainUrl: `https://blockchain-api.tonomy.io`,
    accountSuffix: '.pangea.id',
    communicationUrl: 'wss://communication.tonomy.io',
    accountsServiceUrl: 'http://communication.tonomy.io',
    tonomyIdSchema: 'united-wallet://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy',
    currencySymbol: 'TONO',
};

type SettingsType = {
    env: string;
    config: ConfigType;
    isProduction: () => boolean;
};

let config: ConfigType;
const settings: SettingsType = {
    env,
    isProduction: () => settings.env === 'production',
} as SettingsType;

switch (env) {
    case 'test':
    case 'local':
    case 'development':
        config = defaultConfig;
        break;
    case 'staging':
        config = stagingConfig;
        break;
    case 'testnet':
        config = testnetConfig;
        break;
    case 'production':
        config = productionConfig;
        break;
    default:
        throw new Error('Unknown environment: ' + env);
}

settings.config = config;

export default settings;
