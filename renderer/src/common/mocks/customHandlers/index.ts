import { http, HttpResponse } from 'msw'
import type json from '../../../../../api/openapi.json'
import { getMockLogs } from './fixtures/servers'

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
