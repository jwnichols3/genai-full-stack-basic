const base = require('./base');

module.exports = {
  ...base,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },
  transform: {
    ...base.transform,
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
};
