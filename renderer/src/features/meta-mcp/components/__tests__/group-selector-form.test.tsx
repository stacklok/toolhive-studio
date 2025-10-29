import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { GroupSelectorForm } from '../group-selector-form'
import {
  META_MCP_SERVER_NAME,
  ALLOWED_GROUPS_ENV_VAR,
} from '@/common/lib/constants'
import { useUpdateServer } from '@/features/mcp-servers/hooks/use-update-server'
import { toast } from 'sonner'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
import { useCreateOptimizerWorkload } from '../../hooks/use-create-optimizer-workload'

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/mcp-optimizer' }),
}))

vi.mock('@/features/mcp-servers/hooks/use-update-server')

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock('@/features/meta-mcp/hooks/use-mcp-optimizer-clients', () => ({
  useMcpOptimizerClients: vi.fn(),
}))

vi.mock('../../hooks/use-create-optimizer-workload', () => ({
  useCreateOptimizerWorkload: vi.fn(),
}))

describe('GroupSelectorForm', () => {
  const mockGroups = [
    { name: 'default', servers: ['server1', 'server2'] },
    { name: 'production', servers: ['server3'] },
    { name: 'development', servers: [] },
  ]

  let queryClient: QueryClient
  let mockSaveGroupClients: ReturnType<typeof vi.fn>
  let mockHandleCreateMetaOptimizerWorkload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Clear all mocks
    vi.clearAllMocks()

    // Mock console.warn to suppress Radix UI DialogContent warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Setup mock for saveGroupClients
    mockSaveGroupClients = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useMcpOptimizerClients).mockReturnValue({
      saveGroupClients: mockSaveGroupClients,
      restoreClientsToGroup: vi.fn(),
    } as ReturnType<typeof useMcpOptimizerClients>)

    // Setup mock for handleCreateMetaOptimizerWorkload
    mockHandleCreateMetaOptimizerWorkload = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useCreateOptimizerWorkload).mockReturnValue({
      isNotEnabled: false,
      isPending: false,
      optimizerWorkloadDetail: undefined,
      isMCPOptimizerEnabled: true,
      handleCreateMetaOptimizerWorkload: mockHandleCreateMetaOptimizerWorkload,
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
        if (params.name === META_MCP_SERVER_NAME) {
          return HttpResponse.json(null, { status: 404 })
        }
        return HttpResponse.json(null, { status: 404 })
      })
    )

    // Setup default mock for useUpdateServer
    vi.mocked(useUpdateServer).mockReturnValue({
      updateServerMutation: vi.fn().mockResolvedValue({}),
    } as ReturnType<typeof useUpdateServer>)
  })

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    )
  }

  it('renders all group options', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeInTheDocument()
      expect(screen.getByText('production')).toBeInTheDocument()
      expect(screen.getByText('development')).toBeInTheDocument()
    })
  })

  it('displays server names for each group', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(screen.getByText('server1, server2')).toBeInTheDocument()
      expect(screen.getByText('server3')).toBeInTheDocument()
      expect(screen.getByText('No servers')).toBeInTheDocument()
    })
  })

  it('renders the Apply Changes button', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /set optimized group/i })
      ).toBeInTheDocument()
    })
  })

  it('renders radio buttons for each group', async () => {
    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      const radioButtons = screen.getAllByRole('radio')
      expect(radioButtons).toHaveLength(3)
    })
  })

  it('allows selecting a group', async () => {
    const user = userEvent.setup()

    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    await waitFor(() => {
      expect(
        screen.getByRole('radio', { name: /default/i })
      ).toBeInTheDocument()
    })

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    await user.click(defaultRadio)
    expect(defaultRadio).toBeChecked()
  })

  it('handles empty groups array', async () => {
    renderWithClient(<GroupSelectorForm groups={[]} />)

    await waitFor(() => {
      const radioButtons = screen.queryAllByRole('radio')
      expect(radioButtons).toHaveLength(0)

      expect(
        screen.getByRole('button', { name: /set optimized group/i })
      ).toBeInTheDocument()
    })
  })

  it('submits form with different group and updates ALLOWED_GROUPS_ENV_VAR', async () => {
    const user = userEvent.setup()
    const mockUpdateServerMutation = vi.fn().mockResolvedValue({})

    vi.mocked(useUpdateServer).mockReturnValue({
      updateServerMutation: mockUpdateServerMutation,
    } as ReturnType<typeof useUpdateServer>)

    const mockMetaMcpConfig = {
      name: META_MCP_SERVER_NAME,
      transport: 'sse' as const,
      env_vars: {
        [ALLOWED_GROUPS_ENV_VAR]: 'old-group',
        OTHER_VAR: 'other_value',
      },
      networkIsolation: false,
      secrets: [],
    }

    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
        if (params.name === META_MCP_SERVER_NAME) {
          return HttpResponse.json(mockMetaMcpConfig)
        }
        return HttpResponse.json(null, { status: 404 })
      })
    )

    renderWithClient(<GroupSelectorForm groups={mockGroups} />)

    // Wait for the config to load
    await waitFor(() => {
      expect(
        screen.getByRole('radio', { name: /default/i })
      ).toBeInTheDocument()
    })

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    await user.click(defaultRadio)

    const submitButton = screen.getByRole('button', {
      name: /set optimized group/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateServerMutation).toHaveBeenCalled()
    })

    const callArgs = mockUpdateServerMutation.mock.calls[0]
    const envVars = callArgs?.[0]?.data?.envVars
    expect(envVars).toEqual([
      { name: 'OTHER_VAR', value: 'other_value' },
      { name: ALLOWED_GROUPS_ENV_VAR, value: 'default' },
    ])
    // Verify that ALLOWED_GROUPS_ENV_VAR was replaced, not duplicated
    const allowedGroupsVars = envVars.filter(
      (v: { name: string }) => v.name === ALLOWED_GROUPS_ENV_VAR
    )
    expect(allowedGroupsVars).toHaveLength(1)
    expect(allowedGroupsVars[0].value).toBe('default')
  })

  describe('Toast notifications', () => {
    const mockMetaMcpConfig = {
      name: META_MCP_SERVER_NAME,
      transport: 'sse' as const,
      env_vars: {
        [ALLOWED_GROUPS_ENV_VAR]: 'old-group',
      },
      networkIsolation: false,
      secrets: [],
    }

    beforeEach(() => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          if (params.name === META_MCP_SERVER_NAME) {
            return HttpResponse.json(mockMetaMcpConfig)
          }
          return HttpResponse.json(null, { status: 404 })
        })
      )
    })

    it('shows success toast when form submission succeeds', async () => {
      const user = userEvent.setup()
      const mockUpdateServerMutation = vi
        .fn()
        .mockImplementation((_, options) => {
          options?.onSuccess?.()
          return Promise.resolve()
        })

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButton = screen.getByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSaveGroupClients).toHaveBeenCalledWith({
          groupName: 'default',
          previousGroupName: 'old-group',
        })
        expect(toast.success).toHaveBeenCalledWith(
          'MCP Optimizer applied to default group'
        )
      })
    })

    it('shows error toast when mutation fails', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Mutation failed')
      const mockUpdateServerMutation = vi
        .fn()
        .mockImplementation((_, options) => {
          options?.onError?.(mockError)
          options?.onSettled?.()
          return Promise.reject(mockError)
        })

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButton = screen.getByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error updating MCP Optimizer')
      })
    })
  })

  describe('Error handling', () => {
    const mockMetaMcpConfig = {
      name: META_MCP_SERVER_NAME,
      transport: 'sse' as const,
      env_vars: {
        [ALLOWED_GROUPS_ENV_VAR]: 'old-group',
      },
      networkIsolation: false,
      secrets: [],
    }

    beforeEach(() => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          if (params.name === META_MCP_SERVER_NAME) {
            return HttpResponse.json(mockMetaMcpConfig)
          }
          return HttpResponse.json(null, { status: 404 })
        })
      )
    })

    it('logs error when saveGroupClients fails', async () => {
      const user = userEvent.setup()
      const mockError = new Error(
        'Failed to add servers to optimizer group: server1, server2'
      )

      // Mock saveGroupClients to reject with specific error
      mockSaveGroupClients.mockRejectedValue(mockError)

      const mockUpdateServerMutation = vi
        .fn()
        .mockImplementation(async (_, options) => {
          // Simulate successful mutation, then try to save clients
          await options?.onSuccess?.()
          return Promise.resolve()
        })

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButtons = screen.getAllByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButtons[0] as unknown as Element)

      await waitFor(() => {
        expect(mockSaveGroupClients).toHaveBeenCalledWith({
          groupName: 'default',
          previousGroupName: 'old-group',
        })
      })

      expect(toast.success).not.toHaveBeenCalled()
    })

    it('handles mutation error and shows error toast', async () => {
      const user = userEvent.setup()
      const mockError = new Error('API error')

      const mockUpdateServerMutation = vi
        .fn()
        .mockImplementation((_, options) => {
          options?.onError?.(mockError)
          options?.onSettled?.()
          return Promise.reject(mockError)
        })

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButton = screen.getByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error updating MCP Optimizer')
        expect(mockSaveGroupClients).not.toHaveBeenCalled()
      })
    })

    it('disables submit button when no group is selected', async () => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          if (params.name === META_MCP_SERVER_NAME) {
            // Return config without ALLOWED_GROUPS_ENV_VAR
            return HttpResponse.json({
              name: META_MCP_SERVER_NAME,
              transport: 'sse' as const,
              env_vars: {},
              networkIsolation: false,
              secrets: [],
            })
          }
          return HttpResponse.json(null, { status: 404 })
        })
      )

      const mockUpdateServerMutation = vi.fn()

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', {
          name: /set optimized group/i,
        })
        expect(buttons.length).toBeGreaterThan(0)
      })

      const submitButtons = screen.getAllByRole('button', {
        name: /set optimized group/i,
      })
      const submitButton = submitButtons[0]

      // Button should be disabled when no group is selected
      expect(submitButton).toBeDisabled()

      // Mutation should not be called
      expect(mockUpdateServerMutation).not.toHaveBeenCalled()
      expect(mockSaveGroupClients).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('handles metaMcpConfig being null', async () => {
      const user = userEvent.setup()

      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(null, { status: 404 })
        })
      )

      const mockUpdateServerMutation = vi.fn()

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: mockUpdateServerMutation,
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButton = screen.getByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButton)

      // Should not proceed with submission if metaMcpConfig is null
      await waitFor(() => {
        expect(mockUpdateServerMutation).not.toHaveBeenCalled()
      })
    })
  })

  describe('Creating MCP Optimizer (metaMcpConfig is null)', () => {
    beforeEach(() => {
      // Reset the mock to resolved state
      mockHandleCreateMetaOptimizerWorkload.mockResolvedValue(undefined)

      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(null, { status: 404 })
        })
      )
    })

    it('calls handleCreateMetaOptimizerWorkload when metaMcpConfig is null', async () => {
      const user = userEvent.setup()

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: vi.fn(),
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButtons = screen.getAllByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButtons[0] as unknown as Element)

      // Should call handleCreateMetaOptimizerWorkload when metaMcpConfig is null
      await waitFor(() => {
        expect(mockHandleCreateMetaOptimizerWorkload).toHaveBeenCalledWith({
          groupToOptimize: 'default',
          optimized_workloads: ['server1', 'server2', 'server3'],
        })
      })
    })

    it('logs error when handleCreateMetaOptimizerWorkload fails', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Failed to create MCP Optimizer workload')

      mockHandleCreateMetaOptimizerWorkload.mockRejectedValue(mockError)

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: vi.fn(),
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /production/i })
        ).toBeInTheDocument()
      })

      const productionRadio = screen.getByRole('radio', { name: /production/i })
      await user.click(productionRadio)

      const submitButtons = screen.getAllByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButtons[0] as unknown as Element)

      await waitFor(() => {
        expect(mockHandleCreateMetaOptimizerWorkload).toHaveBeenCalledWith({
          groupToOptimize: 'production',
          optimized_workloads: ['server1', 'server2', 'server3'],
        })
      })

      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not call saveGroupClients when creating new optimizer', async () => {
      const user = userEvent.setup()

      vi.mocked(useUpdateServer).mockReturnValue({
        updateServerMutation: vi.fn(),
      } as ReturnType<typeof useUpdateServer>)

      renderWithClient(<GroupSelectorForm groups={mockGroups} />)

      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: /default/i })
        ).toBeInTheDocument()
      })

      const defaultRadio = screen.getByRole('radio', { name: /default/i })
      await user.click(defaultRadio)

      const submitButtons = screen.getAllByRole('button', {
        name: /set optimized group/i,
      })
      await user.click(submitButtons[0] as unknown as Element)

      await waitFor(() => {
        expect(mockHandleCreateMetaOptimizerWorkload).toHaveBeenCalledWith({
          groupToOptimize: 'default',
          optimized_workloads: ['server1', 'server2', 'server3'],
        })
      })

      // saveGroupClients should NOT be called when creating new optimizer
      expect(mockSaveGroupClients).not.toHaveBeenCalled()
    })
  })
})
