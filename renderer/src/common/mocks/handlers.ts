import { http, HttpResponse } from 'msw'
import {
  createWorkloadResponseFixture,
  getWorkloadByName,
  workloadListFixture,
} from './fixtures/servers'
import { mswEndpoint } from './msw-endpoint'
import { versionFixture } from './fixtures/version'
import { clientsFixture } from './fixtures/clients'
import type { V1CreateRequest } from '../api/generated/types.gen'
import { registryServerFixture } from './fixtures/registry_server'

export const handlers = [
  http.get(mswEndpoint('/health'), () => {
    return new HttpResponse(null, {
      status: 204,
    })
  }),

  http.get(mswEndpoint('/api/v1beta/version'), () => {
    return HttpResponse.json(versionFixture)
  }),

  http.get(mswEndpoint('/api/v1beta/workloads'), () => {
    // TODO: Don't stringify after
    // https://github.com/stacklok/toolhive/issues/495 is resolved
    return HttpResponse.json(workloadListFixture)
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

  http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
    // TODO: Don't stringify after
    // https://github.com/stacklok/toolhive/issues/495 is resolved
    return HttpResponse.json(clientsFixture)
  }),

  http.get(
    mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
    ({ params }) => {
      const { name } = params
      return HttpResponse.json({ ...registryServerFixture, name })
    }
  ),

  http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
    return HttpResponse.json({ keys: [] })
  }),
]
