import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts'

export default defineConfig({
  input: 'src/common/api/openapi.json',
  output: {
    case: undefined,
    path: 'src/common/api/generated',
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
