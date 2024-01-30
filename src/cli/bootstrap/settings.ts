import address from 'address';
import { LoggerLevel } from '../../sdk/util/settings';

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
};

const ipAddress = address.ip();

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
};

const testnetConfig = {
    environment: 'demo',
    ssoWebsiteOrigin: `https://accounts.testnet.pangea.web4.world`,
    demoWebsiteOrigin: `https://demo.testnet.pangea.web4.world`,
    consoleWebsiteOrigin: `https://console.developers.testnet.pangea.web4.world`,
    blockchainUrl: `https://blockchain-api-testnet.pangea.web4.world`,
    accountSuffix: '.testnet.pangea',
    communicationUrl: 'wss://communication.testnet.pangea.web4.world',
    accountsServiceUrl: 'http://communication.testnet.pangea.web4.world',
    tonomyIdSchema: 'pangea-testnet://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Pangea Testnet',
};

const productionConfig = {
    environment: 'production',
    ssoWebsiteOrigin: `https://accounts.pangea.web4.world`,
    demoWebsiteOrigin: `https://demo.pangea.web4.world`,
    consoleWebsiteOrigin: `https://console.developers.pangea.web4.world`,
    blockchainUrl: `https://blockchain-api-production.pangea.web4.world`,
    accountSuffix: '.production.pangea',
    communicationUrl: 'wss://communication.pangea.web4.world',
    accountsServiceUrl: 'http://communication.pangea.web4.world',
    tonomyIdSchema: 'pangea://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Pangea',
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
