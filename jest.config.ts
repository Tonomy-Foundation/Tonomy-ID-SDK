import type { Config } from 'jest';

const baseConfig: Config = {
    preset: 'ts-jest',
    testEnvironment: '../custom-test-env.js',
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.json' }],
    },
    transformIgnorePatterns: [],
    roots: ['<rootDir>'],
    moduleNameMapper: {
        uint8arrays: '<rootDir>/../node_modules/uint8arrays',
    },
    testMatch: ['**/*.test.ts'],
};

const config: Config = {
    projects: [
        {
            ...baseConfig,
            displayName: 'Unit tests',
            rootDir: './test',
        },
        {
            ...baseConfig,
            displayName: 'Integration tests',
            rootDir: './test-integration',
        },
    ],
};

export default config;
