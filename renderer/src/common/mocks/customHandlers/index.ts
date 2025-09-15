import { http, HttpResponse } from 'msw'
import type json from '../../../../../api/openapi.json'
import {
  createWorkloadResponseFixture,
  getWorkloadByName,
  workloadListFixture,
  getMockLogs,
} from './fixtures/servers'
import { clientsFixture } from './fixtures/clients'
import type {
  V1CreateRequest,
  V1CreateSecretRequest,
  V1UpdateRegistryRequest,
} from '../../../../../api/generated/types.gen'
import { registryServerFixture } from './fixtures/registry_server'
import { MOCK_REGISTRY_RESPONSE } from './fixtures/registry'
import { secretsListFixture } from './fixtures/secrets'
import { DEFAULT_REGISTRY } from './fixtures/default_registry'

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
  http.get(mswEndpoint('/health'), () => {
    return new HttpResponse(null, {
      status: 204,
    })
  }),

  http.get(mswEndpoint('/api/v1beta/workloads'), ({ request }) => {
    const url = new URL(request.url)
    const group = (url.searchParams.get('group') || 'default').toLowerCase()
    const examples: Record<string, string[]> = {
      default: ['postgres-db', 'vscode-server', 'osv-2', 'osv'],
      research: ['github', 'fetch'],
      archive: [],
    }
    const names = examples[group] ?? examples.default
    const filtered = (workloadListFixture.workloads ?? []).filter((w) =>
      (names ?? []).includes(w.name || '')
    )
    return HttpResponse.json({ workloads: filtered })
  }),

  http.post(mswEndpoint('/api/v1beta/workloads'), async ({ request }) => {
    try {
      const { name, target_port } = (await request.json()) as V1CreateRequest

      const response = {
        ...createWorkloadResponseFixture,
        name,
        port: target_port || createWorkloadResponseFixture.port,
      }

      return HttpResponse.json(response, { status: 201 })
    } catch {
      return HttpResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }),

  http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
    const { name } = params

    const server = getWorkloadByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return HttpResponse.json(server)
  }),

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

  // Removed: POST /api/v1beta/workloads/restart — allow auto-generated mock to handle this

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

  http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
    // TODO: Don't stringify after
    // https://github.com/stacklok/toolhive/issues/495 is resolved
    return HttpResponse.json(clientsFixture)
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

  // Removed: GET /api/v1beta/clients — allow auto-generated mock to handle this

  http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
    return HttpResponse.json({ servers: MOCK_REGISTRY_RESPONSE })
  }),

  http.get(mswEndpoint('/api/v1beta/registry/:name'), async () => {
    return HttpResponse.json(DEFAULT_REGISTRY)
  }),

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

  http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
    return HttpResponse.json(secretsListFixture)
  }),

  http.post(
    mswEndpoint('/api/v1beta/secrets/default/keys'),
    async ({ request }) => {
      const { key, value } = (await request.json()) as V1CreateSecretRequest

      try {
        return HttpResponse.json({ key, value }, { status: 201 })
      } catch {
        return HttpResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      }
    }
  ),
  http.put(
    mswEndpoint('/api/v1beta/secrets/default/keys/:key'),
    async ({ request }) => {
      const { value } = (await request.json()) as V1CreateSecretRequest

      try {
        return HttpResponse.json({ value }, { status: 201 })
      } catch {
        return HttpResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      }
    }
  ),
  http.delete(
    mswEndpoint('/api/v1beta/secrets/default/keys/:key'),
    async () => new HttpResponse(null, { status: 204 })
  ),
]
