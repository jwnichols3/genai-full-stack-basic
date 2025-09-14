module.exports = {
  ...require('../packages/config/jest/base'),
  rootDir: '.',
  displayName: 'infrastructure',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/tests'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
    '^@config/(.*)$': '<rootDir>/../packages/config/src/$1'
  }
};