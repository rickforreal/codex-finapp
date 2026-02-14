module.exports = {
  root: true,
  ignorePatterns: ['dist/', 'node_modules/'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    es2022: true,
    node: true,
    browser: true,
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['packages/shared/src/domain/**/*.{ts,tsx}', 'packages/shared/src/contracts/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '../ui/*',
              '../../ui/*',
              '@finapp/shared/ui/*',
              '@finapp/shared/src/ui/*'
            ]
          }
        ]
      }
    }
  ]
};
