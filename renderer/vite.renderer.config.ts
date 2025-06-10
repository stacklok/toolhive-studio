import path from 'path'
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite')
  const { TanStackRouterVite } = await import('@tanstack/router-plugin/vite')

  return {
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
      tailwindcss(), // now loaded via dynamic import → no require() conflict
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN, // NOTE: This should be available only during CI
        org: process.env.SENTRY_ORG, // NOTE: This should be available only during CI
        project: process.env.SENTRY_PROJECT, // NOTE: This should be available only during CI
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
