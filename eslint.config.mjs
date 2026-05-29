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
      // Allow route files to export `Route = createFileRoute(...)(...)`
      // alongside their component, and allow shared constants in
      // component files. The TanStack helpers aren't real React HOCs,
      // but listing them here matches our project convention of
      // co-locating the component with the route definition.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          extraHOCs: ['createFileRoute', 'createRootRouteWithContext'],
        },
      ],
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
])
