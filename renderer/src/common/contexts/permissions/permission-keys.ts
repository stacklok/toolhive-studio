/**
 * Add a new entry to gate a UI feature behind `canShow()`.
 * Every key defaults to `true` (visible); downstream builds
 * can override individual keys to `false` via the `permissions`
 * prop on `<AppProviders>`.
 *
 * @example
 * export const PERMISSION_KEYS = {
 *   LOCAL_MCP_RUN: 'local-mcp-run',
 *   PLAYGROUND: 'playground',
 * } as const
 */
export const PERMISSION_KEYS = {
  AUTO_UPDATE: 'auto-update',
} as const

export type PermissionKey =
  (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS]
