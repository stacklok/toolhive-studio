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
    rules: {
      ...reactRefresh.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
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
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  // EXPERIMENT (issue #2296): ban hardcoded brand literals; enumerate sites.
  {
    files: [
      'renderer/**/*.{ts,tsx}',
      'main/**/*.{ts,tsx}',
      'common/**/*.{ts,tsx}',
      'preload/**/*.{ts,tsx}',
    ],
    ignores: [
      '**/__tests__/**',
      '**/*.test.{ts,tsx}',
      'common/app-info.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/ToolHive/]',
          message:
            "Hardcoded 'ToolHive' brand string — import from @common/app-info instead.",
        },
        {
          selector: 'JSXText[value=/ToolHive/]',
          message:
            "Hardcoded 'ToolHive' brand string — import from @common/app-info instead.",
        },
        {
          selector: 'TemplateElement[value.cooked=/ToolHive/]',
          message:
            "Hardcoded 'ToolHive' brand string — import from @common/app-info instead.",
        },
      ],
    },
  },
])
