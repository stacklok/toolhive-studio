/// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string
  readonly VITE_ENABLE_AUTO_DEVTOOLS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
