/** @type {import('ts-jest').JestConfigWithTsJest} */

// checkout https://github.com/jaredpalmer/tsdx/issues/270

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

module.exports = {
    testEnvironment: 'jsdom',
    // testEnvironment: './custom-test-env.js',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    // preset: 'ts-jest',
    preset: 'ts-jest/presets/js-with-babel',
    // globals: {
    //     'ts-jest': {
    //         tsconfig: './tsconfig.json',
    //         diagnostics: true,
    //     },
    // },
    // transform: {
    //     // '.(ts|tsx)$': 'ts-jest',
    //     // '.(js|jsx)$': 'babel-jest',
    //     '.(ts|tsx)$': require.resolve('ts-jest/dist'),
    //     '.(js|jsx)$': require.resolve('babel-jest'),
    //     // '.(cjs)$': 'babel-jest',
    //     // '../node_modules/@tonomy/did-jwt/lib/index.cjs': 'ts-jest',
    //     // '^.+.cjs{1}$': 'babel-jest',
    //     // '^.+.ts{1}$': [
    //     //     'ts-jest',
    //     //     {
    //     //         tsconfig: './tsconfig.json',
    //     //         useESM: true,
    //     //     },
    //     // ],
    // },
    // transformIgnorePatterns: ['/node_modules/(?!@tonomy/did-jwt/lib/index.cjs)', '../src/util/message.ts'],
    testEnvironmentOptions: {
        browsers: ['chrome', 'firefox', 'safari'],
    },
    // transformIgnorePatterns: [
    //     // something in the @tonomy/did-jwt lib is causing this error: SyntaxError: Cannot use import statement outside a module
    //     // and the transformers seem to be changing the errors. so i assume are part of the problem
    //     // ..
    //     // '../src/util/message.ts',
    //     // '../src/user.ts',
    //     // '../src/userApps.ts',
    //     // ..
    //     // these tests are the culplits
    //     // ..
    //     // 'app.test.ts',
    //     // 'services/jskeymanager.ts',
    //     // 'util/message.test.ts',
    //     // 'services/keymanager.test.ts',
    //     // 'util/did-jwk.test.ts',
    // ],
    // transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js)$'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}'],
    watchPlugins: [
        '../node_modules/jest-watch-typeahead/filename.js',
        '../node_modules/jest-watch-typeahead/testname.js',
    ],
};
