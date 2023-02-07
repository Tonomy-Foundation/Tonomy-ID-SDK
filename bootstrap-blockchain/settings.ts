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
    ssoWebsiteOrigin: `http://${ipAddress}:3001`,
    ssoWebsiteLogoUrl: `http://${ipAddress}:3001/tonomy-logo1024.png`,
    demoWebsiteOrigin: `http://${ipAddress}:3000`,
    demoWebsiteLogoUrl: `http://${ipAddress}:3000//market.com.png`,
};

const stagingConfig = {
    ssoWebsiteOrigin: `https://tonomy-id-staging.tonomy.foundation`,
    ssoWebsiteLogoUrl: `https://tonomy-id-staging.tonomy.foundation/tonomy-logo1024.png`,
    demoWebsiteOrigin: `https://tonomy-id-market-com-staging.tonomy.foundation`,
    demoWebsiteLogoUrl: `https://tonomy-id-market-com-staging.tonomy.foundation/market.com.png`,
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
    case 'production':
        config = defaultConfig;
        // TODO add production config when ready
        break;
    default:
        throw new Error('Unknown environment: ' + env);
}

settings.config = config;

export default settings;
