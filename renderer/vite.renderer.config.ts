import path from 'path'
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import autoprefixer from 'autoprefixer'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  root: __dirname,
  build: {
    sourcemap: true, // Required for Sentry sourcemaps
    outDir: path.resolve(__dirname, '../.vite/renderer/main_window'),
  },
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, './src/routes'),
      generatedRouteTree: path.resolve(__dirname, './src/route-tree.gen.ts'),
      quoteStyle: 'double',
      routeFileIgnorePattern: '__tests__',
    }),
    react(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN, // NOTE: This should be available only during CI
      org: process.env.SENTRY_ORG, // NOTE: This should be available only during CI
      project: process.env.SENTRY_PROJECT, // NOTE: This should be available only during CI
    }),
  ],
  css: {
    postcss: {
      // TODO: fix PostCSS plugin type incompatibility
      // @ts-expect-error - PostCSS plugin type incompatibility
      plugins: [tailwindcss, autoprefixer],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
