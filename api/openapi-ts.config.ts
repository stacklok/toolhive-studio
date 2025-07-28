import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi.json',
  output: {
    case: undefined,
    path: './generated',
    format: 'prettier',
    lint: 'eslint',
  },
  plugins: [
    ...defaultPlugins,
    '@tanstack/react-query',
    {
      name: '@hey-api/typescript',
      enums: false,
    },
  ],
})
