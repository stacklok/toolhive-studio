import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, '../utils'),
      '@common': path.resolve(__dirname, '../common'),
    },
  },
})
