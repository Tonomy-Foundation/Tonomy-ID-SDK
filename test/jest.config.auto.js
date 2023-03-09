// https://github.com/jaredpalmer/tsdx/issues/270#issuecomment-571042920

const { createJestConfig } = require('tsdx/dist/createJestConfig');
const { paths } = require('tsdx/dist/constants');

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

config = createJestConfig(undefined, paths.appRoot);

console.log('config', config);
