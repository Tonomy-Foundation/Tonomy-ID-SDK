import type { Config } from 'jest';

// https://www.jenchan.biz/blog/dissecting-the-hell-jest-setup-esm-typescript-setup
// https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
const baseConfig: Config = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/test/test.setup.ts'],
    // typeorm, uuid and ws had difficulties with ESM compatibility
    transform: {
        '^.+\\.m?tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json',
                diagnostics: process.env.CI ? true : false,
            },
        ],
        'node_modules/(typeorm|uuid)/.+\\.(j|t)sx?$': [
            'babel-jest',
            {
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            targets: {
                                node: 'current',
                            },
                        },
                    ],
                ],
            },
        ],
    },
    moduleNameMapper: {
        '^typeorm$': '<rootDir>/node_modules/typeorm/index.mjs',
        '^ws$': '<rootDir>/node_modules/ws/wrapper.mjs',
    },
    transformIgnorePatterns: ['node_modules/(?!typeorm|uuid/)'],
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['./test/**/*.test.ts'],
};

const config: Config = {
    projects: [
        {
            ...baseConfig,
            displayName: 'Unit tests',
            testMatch: ['**/*.unit.test.ts'],
        },
        {
            ...baseConfig,
            displayName: 'Integration tests',
            testMatch: ['**/*.integration.test.ts'],
        },
        {
            ...baseConfig,
            displayName: 'Governance tests',
            testMatch: ['**/*.governance.test.ts'],
        },
    ],
};

export default config;
