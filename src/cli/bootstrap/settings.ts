import address from 'address';

// cannot use NODE_ENV as it is always "production" on `npm run build`
const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type LoggerLevel = 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';

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
    accountSuffix: '.test.tonomy.id',
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

const demoConfig = {
    environment: 'demo',
    ssoWebsiteOrigin: `https://accounts.demo.tonomy.foundation`,
    demoWebsiteOrigin: `https://demo.demo.tonomy.foundation`,
    blockchainUrl: `https://blockchain-api-demo.tonomy.foundation`,
    accountSuffix: '.demo.tonomy.id',
    communicationUrl: 'wss://communication.demo.tonomy.foundation',
    accountsServiceUrl: 'http://communication.demo.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-demo://',
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
    case 'demo':
        config = demoConfig;
        break;
    case 'production':
        throw new Error('Production config not implemented yet');
    default:
        throw new Error('Unknown environment: ' + env);
}

settings.config = config;

export default settings;
