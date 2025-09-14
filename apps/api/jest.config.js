module.exports = {
  ...require('../../packages/config/jest/base'),
  rootDir: '.',
  displayName: 'api',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@config/(.*)$': '<rootDir>/../../packages/config/src/$1'
  }
};