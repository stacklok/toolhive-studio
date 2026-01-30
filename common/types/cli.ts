export type ValidationResult =
  | { status: 'valid' }
  | { status: 'external-cli-found'; cli: ExternalCliInfo }
  | { status: 'symlink-broken'; target: string }
  | { status: 'symlink-tampered'; target: string }
  | { status: 'symlink-missing' }
  | { status: 'fresh-install' }

export interface ExternalCliInfo {
  path: string
  version: string | null
  source: 'homebrew' | 'winget' | 'manual'
}
