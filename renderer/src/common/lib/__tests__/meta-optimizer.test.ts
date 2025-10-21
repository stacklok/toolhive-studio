import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initMetaOptimizer } from '../meta-optimizer'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import log from 'electron-log/renderer'
import { queryClient } from '../query-client'
import * as apiSdk from '@api/sdk.gen'
import { MCP_OPTIMIZER_GROUP_NAME, META_MCP_SERVER_NAME } from '../constants'

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const mockElectronAPI = {
  featureFlags: {
    get: vi.fn(),
  },
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

describe('Meta Optimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  describe('initMetaOptimizer', () => {
    it('not initialize when both flags are disabled', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(false)

      const getGroupsSpy = vi.spyOn(apiSdk, 'getApiV1BetaGroups')
      const postGroupsSpy = vi.spyOn(apiSdk, 'postApiV1BetaGroups')
      const postWorkloadsSpy = vi.spyOn(apiSdk, 'postApiV1BetaWorkloads')

      await initMetaOptimizer()

      expect(getGroupsSpy).not.toHaveBeenCalled()
      expect(postGroupsSpy).not.toHaveBeenCalled()
      expect(postWorkloadsSpy).not.toHaveBeenCalled()
      expect(log.error).not.toHaveBeenCalled()
      expect(log.info).not.toHaveBeenCalled()
    })

    it('initialize and create group when it does not exist', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      const postGroupsSpy = vi.spyOn(apiSdk, 'postApiV1BetaGroups')

      server.use(
        // Mock groups check - group doesn't exist
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ groups: [] })
        ),

        // Mock workload already exists
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ name: META_MCP_SERVER_NAME })
        )
      )

      await initMetaOptimizer()

      expect(postGroupsSpy).toHaveBeenCalledWith({
        body: { name: MCP_OPTIMIZER_GROUP_NAME },
      })
    })

    it('initialize and create group and workload when they do not exist', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      const postWorkloadsSpy = vi.spyOn(apiSdk, 'postApiV1BetaWorkloads')

      server.use(
        // Mock groups check - group doesn't exist
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ groups: [] })
        ),
        // Mock workload check - workload doesn't exist (404)
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ error: 'Workload not found' }, { status: 404 })
        ),
        // Mock server from registry
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        )
      )

      await initMetaOptimizer()

      expect(postWorkloadsSpy).toHaveBeenCalledWith({
        body: expect.objectContaining({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          image: 'ghcr.io/stackloklabs/meta-mcp:latest',
          transport: 'streamable-http',
        }),
      })
    })

    it('skip workload creation if it already exists', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      const postWorkloadsSpy = vi.spyOn(apiSdk, 'postApiV1BetaWorkloads')

      server.use(
        // Mock group exists
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [{ name: MCP_OPTIMIZER_GROUP_NAME }],
          })
        ),
        // Mock workload already exists
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ name: META_MCP_SERVER_NAME })
        )
      )

      await initMetaOptimizer()

      expect(postWorkloadsSpy).not.toHaveBeenCalled()
    })

    it('handle group fetch errors gracefully', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ error: 'Server error' }, { status: 500 })
        )
      )

      await initMetaOptimizer()

      expect(log.error).toHaveBeenCalledWith(
        '[ensureMetaOptimizerGroup] Error checking group:',
        expect.any(Error)
      )
    })

    it('not call workload creation when group creation fails', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      const postWorkloadsSpy = vi.spyOn(apiSdk, 'postApiV1BetaWorkloads')

      server.use(
        // Mock groups check - group doesn't exist
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ groups: [] })
        ),
        // Mock group creation fails
        http.post(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json(
            { error: 'Failed to create group' },
            { status: 500 }
          )
        ),
        // Mock workload check - workload doesn't exist (404)
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ error: 'Workload not found' }, { status: 404 })
        )
      )

      await initMetaOptimizer()

      expect(postWorkloadsSpy).not.toHaveBeenCalled()
      expect(log.error).toHaveBeenCalledWith(
        '[createMetaOptimizerGroup] Failed to create group:',
        expect.objectContaining({ error: 'Failed to create group' })
      )
    })

    it('handle workload creation failure', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      server.use(
        // Mock groups check - group doesn't exist
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ groups: [] })
        ),
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ error: 'Workload not found' }, { status: 404 })
        ),
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json(
            { error: 'Failed to create workload' },
            { status: 500 }
          )
        )
      )

      await initMetaOptimizer()

      expect(log.error).toHaveBeenCalledWith(
        '[createMetaOptimizerWorkload] Failed to create meta optimizer workload:',
        expect.objectContaining({ error: 'Failed to create workload' })
      )
    })

    it('handle missing server from registry', async () => {
      mockElectronAPI.featureFlags.get.mockResolvedValue(true)

      server.use(
        // Mock groups check - group doesn't exist
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({ groups: [] })
        ),
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ error: 'Workload not found' }, { status: 404 })
        ),
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () => HttpResponse.json({ server: null })
        )
      )

      await initMetaOptimizer()

      expect(log.info).toHaveBeenCalledWith(
        '[createMetaOptimizerWorkload] Server not found in the registry'
      )
    })
  })
})
