module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/index.js'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
};
