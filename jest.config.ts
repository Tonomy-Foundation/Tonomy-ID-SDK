import { defaults } from 'jest-config';
import type { Config } from 'jest';

const baseConfig: Config = {
    testEnvironment: 'node',
    moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
    setupFilesAfterEnv: ['<rootDir>/test/test.setup.ts'],
    transform: {
        '^.+\\.m?tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json',
            },
        ],
    },
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
