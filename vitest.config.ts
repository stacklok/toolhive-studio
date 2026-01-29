/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
      '@common': path.resolve(__dirname, './common'),
      '@utils': path.resolve(__dirname, './utils'),
      '@mocks': path.resolve(__dirname, './renderer/src/common/mocks'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: path.resolve(__dirname, './vitest.setup.ts'),
    env: {
      VITE_BASE_API_URL: 'https://foo.bar.com',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'e2e-tests/**/*',
    ],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['renderer/src/**/*.{ts,tsx}', 'main/src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'common/api/generated/**',
        'renderer/src/common/mocks/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/__tests__/**',
        '**/test-utils.tsx',
        '**/*.stories.tsx',
        'vitest.setup.ts',
        'vitest.config.ts',
        'e2e-tests/**',
        'main/src/csp.ts',
        'main/src/logger.ts',
        'main/src/headers.ts',
      ],
    },
  },
})
