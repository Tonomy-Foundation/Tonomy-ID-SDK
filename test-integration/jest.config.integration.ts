import unitConfig from '../test/jest.config.unit';

export default {
    ...unitConfig,
    displayName: 'Integration tests',
    testEnvironment: '../test/custom-test-env.js',
};
