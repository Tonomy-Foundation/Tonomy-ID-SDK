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
    ssoWebsiteOrigin: `https://accounts.testnet.tonomy.foundation`,
    demoWebsiteOrigin: `https://testnet.demo.tonomy.foundation`,
    blockchainUrl: `https://blockchain-api-testnet.tonomy.foundation`,
    accountSuffix: '.testnet.tonomy.id',
    communicationUrl: 'wss://communication.testnet.tonomy.foundation',
    accountsServiceUrl: 'http://communication.testnet.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-demo://',
    loggerLevel: 'info' as LoggerLevel,
};

const productionConfig = {
    environment: 'production',
    ssoWebsiteOrigin: `https://accounts.tonomy.network`,
    demoWebsiteOrigin: `https://demo.tonomy.network`,
    blockchainUrl: `https://blockchain-api-production.tonomy.network`,
    accountSuffix: '.demo.tonomy.id',
    communicationUrl: 'wss://communication.tonomy.network',
    accountsServiceUrl: 'http://communication.tonomy.network',
    tonomyIdSchema: 'tonomy-id-production://',
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
