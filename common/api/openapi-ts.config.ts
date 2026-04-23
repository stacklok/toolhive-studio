import { defineConfig, defaultPlugins } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi.json',
  output: {
    case: undefined,
    path: './generated',
    postProcess: ['prettier'],
  },
  plugins: [
    ...defaultPlugins.filter((p) => p !== '@hey-api/typescript'),
    {
      name: '@hey-api/typescript',
      enums: false,
    },
    '@tanstack/react-query',
  ],
})
