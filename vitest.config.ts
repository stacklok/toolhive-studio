/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
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
      include: ['renderer/src/**/*.{js,jsx}', 'renderer/src/**/*.{ts,tsx}'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/[.]**',
        '**/*.d.ts',
        '**/virtual:*',
        '**/__x00__*',
        '**/\x00*',
        'public/**',
        'test?(s)/**',
        'test?(-*).?(c|m)[jt]s?(x)',
        '**/*{.,-}{test,spec}?(-d).?(c|m)[jt]s?(x)',
        '**/__tests__/**',
        '**/test-utils.tsx',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/vitest.{workspace,projects}.[jt]s?(on)',
        '**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}',
        'renderer/src/**/*stories.tsx',
        'renderer/src/types/**/*.{ts,tsx}',
      ],
      enabled: false,
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
    },
  },
})
