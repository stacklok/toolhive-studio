import { http, HttpResponse } from 'msw'
import type json from '../../../../../api/openapi.json'
import { getWorkloadByName, getMockLogs } from './fixtures/servers'
import type { V1UpdateRegistryRequest } from '../../../../../api/generated/types.gen'
import { registryServerFixture } from './fixtures/registry_server'

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

export const customHandlers = [
  http.delete(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
    const { name } = params

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.post(mswEndpoint('/api/v1beta/workloads/:name/stop'), ({ params }) => {
    const { name } = params

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.post(
    mswEndpoint('/api/v1beta/workloads/:name/restart'),
    ({ params }) => {
      const { name } = params

      const server = getWorkloadByName(name as string)
      if (!server) {
        return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
      }

      return new HttpResponse(null, { status: 204 })
    }
  ),

  http.get(mswEndpoint('/api/v1beta/workloads/:name/status'), ({ params }) => {
    const { name } = params

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return HttpResponse.json({ status: server.status })
  }),

  http.get(mswEndpoint('/api/v1beta/workloads/:name/export'), ({ params }) => {
    const { name } = params

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return HttpResponse.json({
      name: server.name,
      image: server.package || 'ghcr.io/default/default:latest',
      transport: 'stdio',
      target_port: server.port || 0,
      cmd_args: [],
      env_vars: {},
      secrets: [],
      volumes: [],
      isolate_network: false,
      permission_profile: undefined,
      host: '127.0.0.1',
      tools_filter: server.tools || [],
    })
  }),

  http.get(mswEndpoint('/api/v1beta/workloads/:name/logs'), ({ params }) => {
    const { name } = params

    // Special test cases for edge cases
    if (name === 'empty-logs-server') {
      return new HttpResponse('', { status: 200 })
    }

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const logs = getMockLogs(name as string)
    return new HttpResponse(logs, { status: 200 })
  }),

  http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
    try {
      const body = (await request.json()) as { name: string; groups: string[] }
      const { name, groups } = body

      if (!name) {
        return HttpResponse.json(
          { error: 'Client name is required' },
          { status: 400 }
        )
      }

      if (!groups || groups.length === 0) {
        return HttpResponse.json(
          { error: 'Groups parameter is required' },
          { status: 400 }
        )
      }

      return HttpResponse.json(
        {
          name,
          groups: groups || ['default'],
        },
        { status: 200 }
      )
    } catch {
      return HttpResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }),

  http.post(mswEndpoint('/api/v1beta/clients/unregister'), () =>
    HttpResponse.json(null, { status: 204 })
  ),

  http.delete(mswEndpoint('/api/v1beta/clients/:name'), ({ params }) => {
    const { name } = params

    if (!name) {
      return HttpResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(
    mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
    ({ params }) => {
      const { name, group } = params

      if (!name) {
        return HttpResponse.json(
          { error: 'Client name is required' },
          { status: 400 }
        )
      }

      if (!group) {
        return HttpResponse.json(
          { error: 'Group name is required' },
          { status: 400 }
        )
      }

      return new HttpResponse(null, { status: 204 })
    }
  ),

  http.put(mswEndpoint('/api/v1beta/registry/:name'), async ({ request }) => {
    const { local_path, url } =
      (await request.json()) as V1UpdateRegistryRequest

    return HttpResponse.json({ local_path, url })
  }),

  http.get(
    mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
    ({ params }) => {
      const { name } = params
      return HttpResponse.json({ ...registryServerFixture, name })
    }
  ),

  http.delete(
    mswEndpoint('/api/v1beta/secrets/default/keys/:key'),
    async () => new HttpResponse(null, { status: 204 })
  ),
]
