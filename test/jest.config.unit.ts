export default {
    displayName: 'Unit tests',
    preset: 'ts-jest',
    testEnvironment: './custom-test-env.js',
    verbose: true,
    transform: {
        '^.+\\.[t|j]sx?$': ['babel-jest', { configFile: './babel.config.json' }],
    },
    transformIgnorePatterns: [],
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
};
