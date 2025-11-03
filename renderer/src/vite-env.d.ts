/// <reference types="vite/client" />
interface ImportBaseApiEnv {
  readonly VITE_BASE_API_URL: string
}

// Extend renderer env typings for custom development flag
interface ImportMetaEnv extends ImportBaseApiEnv {
  readonly THV_PORT?: string
}
