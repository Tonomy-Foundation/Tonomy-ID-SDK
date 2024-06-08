import type { Config } from 'jest';

const baseConfig: Config = {
    preset: 'ts-jest',
    testEnvironment: './custom-test-env.js',
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.json' }],
    },
    transformIgnorePatterns: [],
    roots: ['<rootDir>'],
    testMatch: ['./test/**/*.test.ts'],
    resolver: "jest-resolver-enhanced",
    moduleNameMapper: {
        "^uint8arrays$": "<rootDir>/node_modules/uint8arrays/esm/src/index.js",
        "^@ipld/dag-pb*": "<rootDir>/node_modules/@ipld/dag-pb/src/index.js",
        "^multiformats/(.*)$": "<rootDir>/node_modules/multiformats/dist/src/$1.js",
        "^ipfs-unixfs$": "<rootDir>/node_modules/ipfs-unixfs/dist/src/index.js",
    }
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
