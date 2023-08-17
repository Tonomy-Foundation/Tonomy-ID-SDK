import address from 'address';

// cannot use NODE_ENV as it is always "production" on `npm run build`
const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type ConfigType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    accountsServiceUrl: string;
    tonomyIdSchema: string;
    loggerLevel: string;
};

const ipAddress = address.ip();

const defaultConfig = {
    environment: 'development',
    ssoWebsiteOrigin: `http://${ipAddress}:3000`,
    ssoWebsiteLogoUrl: `http://${ipAddress}:3000/tonomy-logo1024.png`,
    demoWebsiteOrigin: `http://${ipAddress}:3001`,
    demoWebsiteLogoUrl: `http://${ipAddress}:3001//market.com.png`,
    blockchainUrl: `http://${ipAddress}:8888`,
    accountSuffix: '.test.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-development://',
    loggerLevel: 'info',
};

const stagingConfig = {
    environment: 'staging',
    ssoWebsiteOrigin: `https://accounts.staging.tonomy.foundation`,
    ssoWebsiteLogoUrl: `https://accounts.staging.tonomy.foundation/tonomy-logo1024.png`,
    demoWebsiteOrigin: `https://demo.staging.tonomy.foundation`,
    demoWebsiteLogoUrl: `https://demo.staging.tonomy.foundation/market.com.png`,
    blockchainUrl: `https://blockchain-api-staging.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.staging.tonomy.foundation',
    accountsServiceUrl: 'http://communication.staging.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-staging://',
    loggerLevel: 'info',
};

const demoConfig = {
    environment: 'demo',
    ssoWebsiteOrigin: `https://accounts.demo.tonomy.foundation`,
    ssoWebsiteLogoUrl: `https://accounts.demo.tonomy.foundation/tonomy-logo1024.png`,
    demoWebsiteOrigin: `https://demo.demo.tonomy.foundation`,
    demoWebsiteLogoUrl: `https://demo.demo.tonomy.foundation/market.com.png`,
    blockchainUrl: `https://blockchain-api-demo.tonomy.foundation`,
    accountSuffix: '.demo.tonomy.id',
    communicationUrl: 'wss://communication.demo.tonomy.foundation',
    accountsServiceUrl: 'http://communication.demo.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-demo://',
    loggerLevel: 'info',
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
