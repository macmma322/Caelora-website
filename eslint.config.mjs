import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.astro/**',
      '**/.angular/**',
      '**/bin/**',
      '**/obj/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  },
);
