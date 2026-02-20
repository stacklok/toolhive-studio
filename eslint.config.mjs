// @ts-check
import eslint from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      'dist',
      'coverage',
      '.vite',
      'out',
      '__mocks__/**',
      './common/api/generated/**',
      'utils/digicert-hook.js',
    ],
  },
  {
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    ignores: ['e2e-tests/**/*'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      ...reactHooks.configs.flat.recommended.plugins,
      ...reactRefresh.configs.recommended.plugins,
    },
  },
  {
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    files: ['e2e-tests/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
])
