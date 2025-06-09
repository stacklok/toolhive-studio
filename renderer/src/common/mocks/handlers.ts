import { http, HttpResponse } from 'msw'
import type { V1CreateRequest } from '@/common/api/generated/types.gen'

import { mswEndpoint } from './msw-endpoint'
import { versionFixture } from './fixtures/version'
import {
  createServerResponseFixture,
  getServerByName,
  serverListFixture,
} from './fixtures/servers'
import { clientsFixture } from './fixtures/clients'

export const handlers = [
  http.get(mswEndpoint('/health'), () => {
    return new HttpResponse({
      status: 204,
    })
  }),

  http.get(mswEndpoint('/api/v1beta/version'), () => {
    return HttpResponse.json(versionFixture)
  }),

  http.get(mswEndpoint('/api/v1beta/servers'), () => {
    // TODO: Don't stringify after
    // https://github.com/stacklok/toolhive/issues/495 is resolved
    return HttpResponse.json(JSON.stringify(serverListFixture))
  }),

  http.post(mswEndpoint('/api/v1beta/servers'), async ({ request }) => {
    try {
      const { name, target_port } = (await request.json()) as V1CreateRequest

      const response = {
        ...createServerResponseFixture,
        name,
        port: target_port || createServerResponseFixture.port,
      }

      return HttpResponse.json(response, { status: 201 })
    } catch {
      return HttpResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }),

  http.get(mswEndpoint('/api/v1beta/servers/:name'), ({ params }) => {
    const { name } = params

    const server = getServerByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return HttpResponse.json(server)
  }),

  http.delete(mswEndpoint('/api/v1beta/servers/:name'), ({ params }) => {
    const { name } = params

    const server = getServerByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.post(mswEndpoint('/api/v1beta/servers/:name/stop'), ({ params }) => {
    const { name } = params

    const server = getServerByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.post(mswEndpoint('/api/v1beta/servers/:name/restart'), ({ params }) => {
    const { name } = params

    const server = getServerByName(name as string)
    if (!server) {
      return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.get(mswEndpoint('/api/v1beta/discovery/clients'), () => {
    // TODO: Don't stringify after
    // https://github.com/stacklok/toolhive/issues/495 is resolved
    return HttpResponse.json(JSON.stringify(clientsFixture))
  }),
]
