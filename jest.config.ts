// import { defaults } from 'jest-config';
import type { Config } from 'jest';

const baseConfig: Config = {
    testEnvironment: 'jest-environment-jsdom-sixteen',
    // moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
    setupFilesAfterEnv: ['<rootDir>/test/test.setup.ts'],
    transform: {
        '^.+\\.m?tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json',
                diagnostics: false,
            },
        ],
    },
    // transform: {},
    // transformIgnorePatterns: ['node_modules/(?!typeorm)'],
    // // typescript 5 removes the need to specify relative imports as .js, so we should no longer need this workaround
    // // but webpack still requires .js specifiers, so we are keeping it for now
    // moduleNameMapper: {
    //     '^(\\.{1,2}/.*)\\.js$': '$1',
    // },
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
