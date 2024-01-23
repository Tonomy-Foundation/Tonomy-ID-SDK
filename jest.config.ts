import type { Config } from 'jest';

const baseConfig: Config = {
    preset: 'ts-jest',
    testEnvironment: '../custom-test-env.js',
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.json' }],
    },
    transformIgnorePatterns: [],
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
};

const config: Config = {
    projects: [
        {
            ...baseConfig,
            displayName: 'Unit tests',
            rootDir: './test',
            testMatch: ['**/*.unit.test.ts'],
        },
        {
            ...baseConfig,
            displayName: 'Integration tests',
            rootDir: './test',
            testMatch: ['**/*.integration.test.ts'],
        },
        {
            ...baseConfig,
            displayName: 'Governance tests',
            rootDir: './test',
            testMatch: ['**/*.governance.test.ts'],
        },
    ],
};

export default config;
