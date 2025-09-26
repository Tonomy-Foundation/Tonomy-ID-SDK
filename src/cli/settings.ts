import { ip } from 'address';
import { LoggerLevel, setSettings } from '../sdk/util/settings';

// cannot use NODE_ENV as it is always "production" on `yarn run build`
const env = process.env.NODE_ENV || 'development';

type ConfigType = {
    environment: string;
    blockchainUrl: string;
    ssoWebsiteOrigin: string;
    demoWebsiteOrigin: string;
    consoleWebsiteOrigin: string;
    tonomyAppsOrigin: string;
    accountSuffix: string;
    communicationUrl: string;
    accountsServiceUrl: string;
    tonomyIdSchema: string;
    loggerLevel: LoggerLevel;
    ecosystemName: string;
    currencySymbol: string;
    baseNetwork: 'base' | 'base_testnet' | 'hardhat' | 'localhost';
    baseRpcUrl: string;
    basePrivateKey?: string;
    baseTokenAddress: string;
};

const ipAddress = ip();

if (env === 'development') {
    if (!process.env.BASE_TOKEN_ADDRESS) {
        throw new Error('BASE_TOKEN_ADDRESS is not set in the environment variables');
    }

    console.log('Using BASE_TOKEN_ADDRESS:', process.env.BASE_TOKEN_ADDRESS);
} else {
    if (!process.env.INFURA_API_KEY) {
        throw new Error('INFURA_API_KEY is not set in the environment variables');
    }
}

const defaultConfig = {
    environment: 'development',
    ssoWebsiteOrigin: `http://${ipAddress}:3000`,
    demoWebsiteOrigin: `http://${ipAddress}:3001`,
    consoleWebsiteOrigin: `http://${ipAddress}:3002`,
    tonomyAppsOrigin: `http://${ipAddress}:3003`,
    blockchainUrl: `http://${ipAddress}:8888`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'ws://localhost:5000',
    accountsServiceUrl: 'http://localhost:5000',
    tonomyIdSchema: 'tonomy-id-development://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy - Development',
    currencySymbol: 'TONO',
    baseNetwork: 'hardhat' as const,
    baseRpcUrl: 'http://localhost:8545',
    basePrivateKey: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', // Hardhat account #19
    baseTokenAddress: process.env.BASE_TOKEN_ADDRESS!,
};

const stagingConfig = {
    environment: 'staging',
    ssoWebsiteOrigin: `https://accounts.staging.tonomy.foundation`,
    demoWebsiteOrigin: `https://demo.staging.tonomy.foundation`,
    consoleWebsiteOrigin: `https://console.developers.staging.tonomy.foundation`,
    tonomyAppsOrigin: `http://${ipAddress}:3003`,
    blockchainUrl: `https://blockchain-api-staging.tonomy.foundation`,
    accountSuffix: '.stag.tonomy.id',
    communicationUrl: 'wss://communication.staging.tonomy.foundation',
    accountsServiceUrl: 'http://communication.staging.tonomy.foundation',
    tonomyIdSchema: 'tonomy-id-staging://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy - Staging',
    currencySymbol: 'TONO',
    baseNetwork: 'base_testnet' as const,
    baseRpcUrl: 'https://base-sepolia.infura.io/v3/' + process.env.INFURA_API_KEY,
    baseTokenAddress: 'TODO:',
};

const testnetConfig = {
    environment: 'testnet',
    ssoWebsiteOrigin: `https://accounts.testnet.tonomy.io`,
    demoWebsiteOrigin: `https://demo.testnet.tonomy.io`,
    consoleWebsiteOrigin: `https://console.developers.testnet.tonomy.io`,
    tonomyAppsOrigin: `http://${ipAddress}:3003`,
    blockchainUrl: `https://blockchain-api-testnet.tonomy.io`,
    accountSuffix: '.testnet.pangea',
    communicationUrl: 'wss://communication.testnet.tonomy.io',
    accountsServiceUrl: 'http://communication.testnet.tonomy.io',
    tonomyIdSchema: 'pangea-testnet://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy Testnet',
    currencySymbol: 'TONO',
    baseNetwork: 'base_testnet' as const,
    baseRpcUrl: 'https://base-sepolia.infura.io/v3/' + process.env.INFURA_API_KEY,
    baseTokenAddress: 'TODO:',
};

const productionConfig = {
    environment: 'production',
    ssoWebsiteOrigin: `https://accounts.tonomy.io`,
    demoWebsiteOrigin: `https://demo.tonomy.io`,
    consoleWebsiteOrigin: `https://console.developers.tonomy.io`,
    tonomyAppsOrigin: `http://${ipAddress}:3003`,
    blockchainUrl: `https://blockchain-api.tonomy.io`,
    accountSuffix: '.pangea.id',
    communicationUrl: 'wss://communication.tonomy.io',
    accountsServiceUrl: 'http://communication.tonomy.io',
    tonomyIdSchema: 'united-wallet://',
    loggerLevel: 'info' as LoggerLevel,
    ecosystemName: 'Tonomy',
    currencySymbol: 'TONO',
    baseNetwork: 'base_testnet' as const,
    baseRpcUrl: 'https://base.infura.io/v3/' + process.env.INFURA_API_KEY,
    baseTokenAddress: 'TODO:',
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

setSettings(settings.config);

export default settings;
