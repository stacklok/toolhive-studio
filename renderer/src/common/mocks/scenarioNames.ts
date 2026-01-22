/**
 * Global scenario names for API mocks.
 *
 * Use `MockScenarios.X` for autocomplete with documentation,
 * or use the string literals directly.
 */
export const MockScenarios = {
  /** Empty state - API returns no data */
  Empty: 'empty',
  /** API returns 500 Internal Server Error */
  ServerError: 'server-error',
  /** Resource not found - API returns 404 */
  NotFound: 'not-found',
} as const

/**
 * Union of all available mock scenario names.
 */
export type MockScenarioName =
  (typeof MockScenarios)[keyof typeof MockScenarios]
