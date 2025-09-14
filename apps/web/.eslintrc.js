module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/react.js'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
};