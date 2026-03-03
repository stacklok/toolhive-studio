import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// https://vitejs.dev/config
export default defineConfig({
  build: {
    sourcemap: true, // Required for Sentry sourcemaps
    rollupOptions: {
      external: ['better-sqlite3'],
    },
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, '../common'),
      '@utils': path.resolve(__dirname, '../utils'),
    },
  },
  plugins: [
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN, // NOTE: This should be available only during CI
      org: process.env.SENTRY_ORG, // NOTE: This should be available only during CI
      project: process.env.SENTRY_PROJECT, // NOTE: This should be available only during CI
    }),
  ],
})
