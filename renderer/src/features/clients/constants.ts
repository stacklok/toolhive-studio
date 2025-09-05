/**
 * Client names based on the OpenAPI specification enum
 * These should match the x-enum-varnames in the API schema
 */
export const CLIENT_NAMES = {
  ROO_CODE: 'roo-code',
  CLINE: 'cline',
  CURSOR: 'cursor',
  VSCODE_INSIDER: 'vscode-insider',
  VSCODE: 'vscode',
  CLAUDE_CODE: 'claude-code',
  WINDSURF: 'windsurf',
  WINDSURF_JETBRAINS: 'windsurf-jetbrains',
  AMP_CLI: 'amp-cli',
  AMP_VSCODE: 'amp-vscode',
  AMP_CURSOR: 'amp-cursor',
  AMP_VSCODE_INSIDER: 'amp-vscode-insider',
  AMP_WINDSURF: 'amp-windsurf',
  LM_STUDIO: 'lm-studio',
  GOOSE: 'goose',
} as const

/**
 * Array of all client names for iteration
 */
export const ALL_CLIENT_NAMES = Object.values(CLIENT_NAMES)

/**
 * Type for client names
 */
export type ClientName = (typeof CLIENT_NAMES)[keyof typeof CLIENT_NAMES]

/**
 * Commonly used clients in the UI
 * These are the ones typically shown in the manage clients interface
 */
export const COMMON_CLIENTS = [
  CLIENT_NAMES.VSCODE,
  CLIENT_NAMES.CURSOR,
  CLIENT_NAMES.CLAUDE_CODE,
] as const

/**
 * Type for common client names
 */
export type CommonClientName = (typeof COMMON_CLIENTS)[number]
