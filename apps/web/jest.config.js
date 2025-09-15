module.exports = {
  ...require('../../packages/config/jest/react'),
  rootDir: '.',
  displayName: 'web',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@config/(.*)$': '<rootDir>/../../packages/config/src/$1',
    '^../config/environment$': '<rootDir>/tests/__mocks__/config/environment.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
