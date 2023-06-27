import address from 'address';

// cannot use NODE_ENV as it is always "production" on `npm run build`
const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type ConfigType = {
    ssoWebsiteOrigin: string;
    ssoWebsiteLogoUrl: string;
    demoWebsiteOrigin: string;
    demoWebsiteLogoUrl: string;
};

const ipAddress = address.ip();

const defaultConfig = {
    ssoWebsiteOrigin: `http://${ipAddress}:3000`,
    ssoWebsiteLogoUrl: `http://${ipAddress}:3000/tonomy-logo1024.png`,
    demoWebsiteOrigin: `http://${ipAddress}:3001`,
    demoWebsiteLogoUrl: `http://${ipAddress}:3001//market.com.png`,
    blockchainUrl: `http://${ipAddress}:8888`,
    accountSuffix: '.test.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
};

const stagingConfig = {
    ssoWebsiteOrigin: `https://accounts.staging.tonomy.foundation`,
    ssoWebsiteLogoUrl: `https://accounts.staging.tonomy.foundation/tonomy-logo1024.png`,
    demoWebsiteOrigin: `https://demo.staging.tonomy.foundation`,
    demoWebsiteLogoUrl: `https://demo.staging.tonomy.foundation/market.com.png`,
    blockchainUrl: `https://blockchain-api-staging.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.staging.tonomy.foundation',
};

const demoConfig = {
    ssoWebsiteOrigin: `https://accounts.demo.tonomy.foundation`,
    ssoWebsiteLogoUrl: `https://accounts.demo.tonomy.foundation/tonomy-logo1024.png`,
    demoWebsiteOrigin: `https://demo.demo.tonomy.foundation`,
    demoWebsiteLogoUrl: `https://demo.demo.tonomy.foundation/market.com.png`,
    blockchainUrl: `https://blockchain-api-demo.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.demo.tonomy.foundation',
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
