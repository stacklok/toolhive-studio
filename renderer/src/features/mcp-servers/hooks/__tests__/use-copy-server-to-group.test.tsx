import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCopyServerToGroup } from '../use-copy-server-to-group'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaWorkloadsByName } from '@/common/mocks/fixtures/workloads_name/get'
import { mockedPostApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/post'
import type { V1CreateRequest } from '@common/api/generated/types.gen'
import userEvent from '@testing-library/user-event'
import { PromptProvider } from '@/common/contexts/prompt/provider'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PromptProvider>{children}</PromptProvider>
    </QueryClientProvider>
  )
}

describe('useCopyServerToGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('sends url field instead of image when copying a remote server', async () => {
    const rec = recordRequests()
    const wrapper = createWrapper()

    const remoteServerConfig: V1CreateRequest = {
      name: 'mcp-shell',
      url: 'http://127.0.0.1:8000/mcp',
      transport: 'streamable-http',
      host: '127.0.0.1',
      target_port: 64341,
      env_vars: {
        FASTMCP_PORT: '64341',
        MCP_PORT: '64341',
        MCP_TRANSPORT: 'streamable-http',
      },
      secrets: [],
      permission_profile: {
        name: 'network',
        network: {
          outbound: {
            insecure_allow_all: true,
          },
        },
      },
      network_isolation: false,
    }

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      ...remoteServerConfig,
    }))

    mockedPostApiV1BetaWorkloads.override(() => ({
      name: 'mcp-shell-test-group',
      port: 64341,
    }))

    const { result } = renderHook(() => useCopyServerToGroup('mcp-shell'), {
      wrapper,
    })

    await act(async () => {
      result.current.copyServerToGroup('test-group', 'mcp-shell-test-group')
    })

    await waitFor(async () => {
      const confirmDialog = document.querySelector('[role="dialog"]')
      if (confirmDialog) {
        const okButton = document.querySelector('button:not([data-cancel])')
        if (okButton) {
          await userEvent.click(okButton as HTMLElement)
        }
      }
    })

    await waitFor(() => {
      const createWorkloadRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      expect(createWorkloadRequest).toBeDefined()
      expect(createWorkloadRequest?.payload).toMatchObject({
        name: 'mcp-shell-test-group',
        url: 'http://127.0.0.1:8000/mcp',
        transport: 'streamable-http',
        group: 'test-group',
      })
      expect(createWorkloadRequest?.payload).not.toHaveProperty('image')
    })
  })
})
