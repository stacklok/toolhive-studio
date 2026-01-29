import { http, HttpResponse } from 'msw'
import type json from '@common/api/openapi.json'

/**
 * Mock log generator for the logs endpoint (text/plain).
 * Exported as vi.fn() so tests can mock specific return values.
 */
export const getMockLogs = vi.fn(
  (serverName: string): string =>
    `[2025-06-09 15:30:00] INFO: Server ${serverName} started successfully
[2025-06-09 15:30:01] INFO: Loading configuration...
[2025-06-09 15:30:02] INFO: Configuration loaded successfully
[2025-06-09 15:30:03] INFO: Initializing database connection...
[2025-06-09 15:30:04] INFO: Database connection established
[2025-06-09 15:30:05] INFO: Starting API server...
[2025-06-09 15:30:06] INFO: API server started on port 8080
[2025-06-09 15:30:07] INFO: Server ${serverName} is ready to accept connections
[2025-06-09 15:30:08] INFO: Health check passed
[2025-06-09 15:30:09] INFO: Monitoring system initialized`
)

/**
 * OpenAPI spec uses curly braces to denote path parameters
 * @example
 * ```
 * /api/v1/provider-endpoints/{provider_id}/models
 * ```
 *
 * MSW expects a colon prefix for path parameters
 * @example
 * ```
 * /api/v1/provider-endpoints/:provider_id/models
 * ```
 */
type ReplacePathParams<T extends string> =
  T extends `${infer Start}{${infer Param}}${infer End}`
    ? `${Start}:${Param}${ReplacePathParams<End>}`
    : T

type Endpoint = ReplacePathParams<keyof typeof json.paths>

/**
 * Constructs a full URL for an endpoint defined in the OpenAPI spec. Uses the
 * base URL defined in the environment variable `VITE_BASE_API_URL`. Uses
 * typescript template literal types to ensure the endpoint is valid, according
 * to the OpenAPI spec.
 */
export function mswEndpoint(endpoint: Endpoint) {
  return new URL(endpoint, import.meta.env.VITE_BASE_API_URL).toString()
}

/**
 * Custom handlers for endpoints that need special handling.
 * Most endpoints use AutoAPIMock fixtures; only text/plain endpoints need custom handlers.
 */
export const customHandlers = [
  // Logs endpoint returns text/plain, not JSON - needs custom handler
  http.get(mswEndpoint('/api/v1beta/workloads/:name/logs'), ({ params }) => {
    const { name } = params

    // Special test case for empty logs
    if (name === 'empty-logs-server') {
      return new HttpResponse('', { status: 200 })
    }

    const logs = getMockLogs(name as string)
    return new HttpResponse(logs, { status: 200 })
  }),
]
