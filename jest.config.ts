import type { Config } from 'jest';

const baseConfig: Config = {
    preset: 'ts-jest',
    testEnvironment: '<rootDir>/test/custom-test-env.js',
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.json' }],
    },
    transformIgnorePatterns: [],
    roots: ['<rootDir>'],
    testMatch: ['./test/**/*.test.ts'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    resolver: '<rootDir>/test/jest-resolver.cjs',
    // moduleNameMapper: {
    //     // This is a workaround for the following packages that use conditional exports in package.json which jest does not support yet
    //     // see https://github.com/Tonomy-Foundation/Tonomy-ID-SDK/issues/336
    //     '^uint8arrays$': '<rootDir>/node_modules/uint8arrays/dist/src/index.js',
    //     '^@ipld/dag-pb*': '<rootDir>/node_modules/@ipld/dag-pb/src/index.js',
    //     '^multiformats/(.*)$': '<rootDir>/node_modules/multiformats/dist/src/$1.js',
    //     '^ipfs-unixfs$': '<rootDir>/node_modules/ipfs-unixfs/dist/src/index.js',
    //     '^protons-runtime$': '<rootDir>/node_modules/protons-runtime/dist/src/index.js',
    //     '^uint8-varint$': '<rootDir>/node_modules/uint8-varint/dist/src/index.js',
    //     '^uint8arrays/(.*)$': '<rootDir>/node_modules/uint8arrays/dist/src/$1.js',
    // },
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
