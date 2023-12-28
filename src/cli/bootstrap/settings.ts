import address from 'address';
import { LoggerLevel } from '../../sdk/util/settings';

// cannot use NODE_ENV as it is always "production" on `yarn run build`
const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type ConfigType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    demoWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    accountsServiceUrl: string;
    tonomyIdSchema: string;
    loggerLevel: LoggerLevel;
};

const ipAddress = address.ip();

const defaultConfig = {
    environment: 'development',
    ssoWebsiteOrigin: `http://${ipAddress}:3000`,
    demoWebsiteOrigin: `http://${ipAddress}:3001`,
    blockchainUrl: `http://${ipAddress}:8888`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-development://',
    loggerLevel: 'info' as LoggerLevel,
};

const stagingConfig = {
    environment: 'staging',
    ssoWebsiteOrigin: `https://accounts.staging.tonomy.foundation`,
    demoWebsiteOrigin: `https://demo.staging.tonomy.foundation`,
    blockchainUrl: `https://blockchain-api-staging.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.staging.tonomy.foundation',
    accountsServiceUrl: 'http://communication.staging.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-staging://',
    loggerLevel: 'info' as LoggerLevel,
};

const testnetConfig = {
    environment: 'testnet',
    ssoWebsiteOrigin: `https://accounts.testnet.pangea`,
    demoWebsiteOrigin: `https://testnet.demo.pangea`,
    blockchainUrl: `https://blockchain-api-testnet.pangea`,
    accountSuffix: '.pangea-testnet',
    communicationUrl: 'wss://communication.testnet.pangea',
    accountsServiceUrl: 'http://communication.testnet.pangea',
    tonomyIdSchema: 'pangea-testnet://',
    loggerLevel: 'info' as LoggerLevel,
};

const productionConfig = {
    environment: 'production',
    ssoWebsiteOrigin: `https://accounts.pangea`,
    demoWebsiteOrigin: `https://demo.pangea`,
    blockchainUrl: `https://blockchain-api-production.pangea`,
    accountSuffix: '.pangea',
    communicationUrl: 'wss://communication.pangea',
    accountsServiceUrl: 'http://communication.pangea',
    tonomyIdSchema: 'pangea://',
    loggerLevel: 'info' as LoggerLevel,
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
