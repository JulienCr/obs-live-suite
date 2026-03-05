/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': '<rootDir>/jest.transform.cjs',
  },
  moduleNameMapper: {
    // Strip .js extensions from ESM imports so ts-jest resolves .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
