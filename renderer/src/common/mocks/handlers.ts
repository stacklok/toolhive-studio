import { http, HttpResponse } from 'msw'
import {
  createWorkloadResponseFixture,
  getWorkloadByName,
  workloadListFixture,
  getMockLogs,
} from './fixtures/servers'
import { mswEndpoint } from './msw-endpoint'
import { versionFixture } from './fixtures/version'
import { clientsFixture } from './fixtures/clients'
import type {
  V1CreateRequest,
  V1CreateSecretRequest,
  V1UpdateRegistryRequest,
} from '../../../../api/generated/types.gen'
import { registryServerFixture } from './fixtures/registry_server'
import { MOCK_REGISTRY_RESPONSE } from './fixtures/registry'
import { secretsListFixture } from './fixtures/secrets'
import { DEFAULT_REGISTRY } from './fixtures/default_registry'

export const handlers = [
  http.get(mswEndpoint('/health'), () => {
    return new HttpResponse(null, {
      status: 204,
    })
  }),

  http.get(mswEndpoint('/api/v1beta/version'), () => {
    return HttpResponse.json(versionFixture)
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

  http.get(mswEndpoint('/api/v1beta/groups'), () => {
    return HttpResponse.json({
      groups: [
        { name: 'default', registered_clients: ['client-a'] },
        { name: 'Research team', registered_clients: ['client-b'] },
        { name: 'Archive', registered_clients: [] },
      ],
    })
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

  // Batch restart endpoint
  http.post(
    mswEndpoint('/api/v1beta/workloads/restart'),
    async ({ request }) => {
      try {
        const { names } = (await request.json()) as { names: string[] }

        // Validate all servers exist
        for (const name of names) {
          const server = getWorkloadByName(name)
          if (!server) {
            return HttpResponse.json(
              { error: `Server ${name} not found` },
              { status: 404 }
            )
          }
        }

        return new HttpResponse(null, { status: 204 })
      } catch {
        return HttpResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        )
      }
    }
  ),

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
