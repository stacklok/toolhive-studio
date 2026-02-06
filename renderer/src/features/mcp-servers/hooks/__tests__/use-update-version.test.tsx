import { renderHook, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { useUpdateVersion, toUpdateBody } from '../use-update-version'
import { mockedGetApiV1BetaWorkloadsByName } from '@mocks/fixtures/workloads_name/get'
import { recordRequests } from '@/common/mocks/node'
import type { V1CreateRequest } from '@common/api/generated/types.gen'

const defaultOptions = {
  serverName: 'postgres-db',
  registryImage: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
  localTag: 'latest',
  registryTag: 'v2.0.0',
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PromptProvider>{children}</PromptProvider>
    </QueryClientProvider>
  )
}

describe('useUpdateVersion', () => {
  it('returns isReady true when workload data is loaded', async () => {
    const wrapper = createWrapper()

    const { result } = renderHook(() => useUpdateVersion(defaultOptions), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
  })

  it('returns isReady false when workload data fails to load', async () => {
    const wrapper = createWrapper()

    mockedGetApiV1BetaWorkloadsByName.activateScenario('not-found')

    const { result } = renderHook(() => useUpdateVersion(defaultOptions), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(false)
    })
  })

  it('shows confirmation dialog when promptUpdate is called', async () => {
    const wrapper = createWrapper()

    const { result } = renderHook(() => useUpdateVersion(defaultOptions), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    await act(() => {
      result.current.promptUpdate()
    })

    await waitFor(() => {
      expect(screen.getByText('Update to latest version')).toBeVisible()
      expect(
        screen.getByText('Update "postgres-db" from latest to v2.0.0?')
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Update' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    })
  })

  it('sends update request with full workload config and new image when confirmed', async () => {
    const wrapper = createWrapper()
    const rec = recordRequests()

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'postgres-db',
      image: 'ghcr.io/postgres/postgres-mcp-server:latest',
      transport: 'stdio',
      group: 'default',
      env_vars: { DB_HOST: 'localhost' },
      cmd_arguments: ['--verbose'],
    }))

    const { result } = renderHook(() => useUpdateVersion(defaultOptions), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    await act(() => {
      result.current.promptUpdate()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => {
      const editRequest = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' &&
          r.pathname === '/api/v1beta/workloads/postgres-db/edit'
      )
      expect(editRequest).toBeDefined()
      expect(editRequest?.payload).toMatchObject({
        image: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
        transport: 'stdio',
        group: 'default',
        env_vars: { DB_HOST: 'localhost' },
        cmd_arguments: ['--verbose'],
      })
      // name should NOT be in the payload
      expect(editRequest?.payload).not.toHaveProperty('name')
    })
  })

  it('does not send update request when cancelled', async () => {
    const wrapper = createWrapper()
    const rec = recordRequests()

    const { result } = renderHook(() => useUpdateVersion(defaultOptions), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    await act(() => {
      result.current.promptUpdate()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Wait for the prompt promise to settle after cancel
    await waitFor(() => {
      const editRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname.includes('/edit')
      )
      expect(editRequest).toBeUndefined()
    })
  })
})

describe('toUpdateBody', () => {
  it('removes name and replaces image from workload data', () => {
    const workload: V1CreateRequest = {
      name: 'my-server',
      image: 'ghcr.io/test/server:v1.0.0',
      transport: 'stdio',
      group: 'default',
      env_vars: { API_KEY: 'secret' },
      cmd_arguments: ['--verbose'],
      host: '127.0.0.1',
      target_port: 8080,
      secrets: [{ name: 's1', target: 'SECRET_VAR' }],
      volumes: ['/data:/data'],
      network_isolation: true,
    }

    const result = toUpdateBody(workload, 'ghcr.io/test/server:v2.0.0')

    expect(result).not.toHaveProperty('name')
    expect(result.image).toBe('ghcr.io/test/server:v2.0.0')
    expect(result).toMatchObject({
      image: 'ghcr.io/test/server:v2.0.0',
      transport: 'stdio',
      group: 'default',
      env_vars: { API_KEY: 'secret' },
      cmd_arguments: ['--verbose'],
      host: '127.0.0.1',
      target_port: 8080,
      secrets: [{ name: 's1', target: 'SECRET_VAR' }],
      volumes: ['/data:/data'],
      network_isolation: true,
    })
  })

  it('preserves all other fields from the original workload', () => {
    const workload: V1CreateRequest = {
      name: 'minimal-server',
      image: 'old-image:v1',
    }

    const result = toUpdateBody(workload, 'new-image:v2')

    expect(result).not.toHaveProperty('name')
    expect(result.image).toBe('new-image:v2')
  })

  it('does not mutate the original workload object', () => {
    const workload: V1CreateRequest = {
      name: 'my-server',
      image: 'old-image:v1',
      transport: 'sse',
    }

    const originalName = workload.name

    toUpdateBody(workload, 'new-image:v2')

    expect(workload.name).toBe(originalName)
    expect(workload.image).toBe('old-image:v1')
  })
})
