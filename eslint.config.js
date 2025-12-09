import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['src/**/*.js', 'example/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
    ignores: [
      '**/node_modules/**', // ignore node_modules at any level
      '**/dist/**',
      '.vs/**',
    ],
  },
];
