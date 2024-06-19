import type { Config } from 'jest';

// https://www.jenchan.biz/blog/dissecting-the-hell-jest-setup-esm-typescript-setup
// https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
const baseConfig: Config = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/test/test.setup.ts'],
    transform: {
        // '^.+\\.[tj]sx?$': [ // ts,js,tsx,jsx
        // '^.+\\.m?[tj]sx?$': [ // ts,js,tsx,jsx,mts,mjs,mtsx,mjsx
        // '^.+\\.tsx?$': [ // ts,tsx
        '^.+\\.m?tsx?$': [
            // ts,tsx,mts,mtsx
            'ts-jest',
            {
                useESM: true,
                supportStaticESM: true,
                tsconfig: './tsconfig.json',
                diagnostics: false,
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
    transformIgnorePatterns: ['node_modules/(?!typeorm|uuid|ws/)'],
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
