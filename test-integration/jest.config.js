/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./'],
  globals: {
    'ts-jest': {
      tsconfig: './initialize-blockchain/tsconfig.json',
    },
  },
};
