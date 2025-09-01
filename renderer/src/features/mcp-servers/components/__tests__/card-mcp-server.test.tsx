import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { useConfirm } from '@/common/hooks/use-confirm'
import { usePrompt } from '@/common/hooks/use-prompt'
import { useMutationRestartServer } from '../../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../../hooks/use-mutation-stop-server'
import { useDeleteServer } from '../../hooks/use-delete-server'
import { useMutationUpdateWorkloadGroup } from '../../hooks/use-mutation-update-workload-group'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import {
  getApiV1BetaRegistryByNameServersByServerName,
  getApiV1BetaGroups,
} from '@api/sdk.gen'
import { trackEvent } from '@/common/lib/analytics'
import { toast } from 'sonner'

// Mock the hooks
vi.mock('@/common/hooks/use-confirm')
vi.mock('@/common/hooks/use-prompt')
vi.mock('@/common/hooks/use-feature-flag')
vi.mock('../../hooks/use-mutation-restart-server')
vi.mock('../../hooks/use-mutation-stop-server')
vi.mock('../../hooks/use-delete-server')
vi.mock('../../hooks/use-mutation-update-workload-group')
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})
vi.mock('@api/sdk.gen')
vi.mock('@/common/lib/analytics')
vi.mock('sonner')

// Mock useSearch specifically
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useSearch: vi.fn(),
  }
})

// Create mock functions
const mockUseConfirm = vi.mocked(useConfirm)
const mockUsePrompt = vi.mocked(usePrompt)
const mockUseFeatureFlag = vi.mocked(useFeatureFlag)
const mockUseMutationRestartServer = vi.mocked(useMutationRestartServer)
const mockUseMutationStopServerList = vi.mocked(useMutationStopServerList)
const mockUseDeleteServer = vi.mocked(useDeleteServer)
const mockUseMutationUpdateWorkloadGroup = vi.mocked(
  useMutationUpdateWorkloadGroup
)
const mockUseSearch = vi.mocked(useSearch)
const mockUseQuery = vi.mocked(useQuery)
const mockGetApiV1BetaRegistryByNameServersByServerName = vi.mocked(
  getApiV1BetaRegistryByNameServersByServerName
)
const mockGetApiV1BetaGroups = vi.mocked(getApiV1BetaGroups)
const mockTrackEvent = vi.mocked(trackEvent)
const mockToast = vi.mocked(toast)

const router = createTestRouter(() => (
  <CardMcpServer
    name="test-server"
    status="running"
    statusContext={undefined}
    url=""
    transport="http"
  />
))

beforeEach(() => {
  vi.clearAllMocks()

  // Mock the confirm hook
  mockUseConfirm.mockReturnValue(vi.fn().mockResolvedValue(true))

  // Mock the prompt hook
  mockUsePrompt.mockReturnValue(vi.fn().mockResolvedValue({ value: 'group1' }))

  // Mock the feature flag hook - enable the groups feature
  mockUseFeatureFlag.mockImplementation((flag) => {
    if (flag === 'groups') return true
    return false
  })

  // Mock the mutation hooks
  mockUseMutationRestartServer.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useMutationRestartServer>)

  mockUseMutationStopServerList.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useMutationStopServerList>)

  mockUseDeleteServer.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteServer>)

  mockUseMutationUpdateWorkloadGroup.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as unknown as ReturnType<typeof useMutationUpdateWorkloadGroup>)

  // Mock the API query
  mockGetApiV1BetaRegistryByNameServersByServerName.mockResolvedValue({
    data: {
      server: {
        name: 'test-server',
        status: 'running',
        transport: 'http',
        repository_url: 'https://github.com/test/repo',
      },
    },
    request: {} as Request,
    response: {} as Response,
  })

  // Mock the groups API query
  mockGetApiV1BetaGroups.mockResolvedValue({
    data: {
      groups: [
        { name: 'default', registered_clients: [] },
        { name: 'group1', registered_clients: [] },
        { name: 'group2', registered_clients: [] },
      ],
    },
    request: {} as Request,
    response: {} as Response,
  })

  // Mock the analytics function
  mockTrackEvent.mockImplementation(() => {})

  // Mock the toast function
  mockToast.mockImplementation(() => 'mock-toast-id')

  // Mock the useSearch hook
  mockUseSearch.mockReturnValue({} as unknown as ReturnType<typeof useSearch>)

  // Reset router state
  router.navigate({ to: '/' })

  // Mock the useQuery hook
  mockUseQuery.mockImplementation((options) => {
    const queryKey = options.queryKey

    // Check if this is the serverDetails query
    if (Array.isArray(queryKey) && queryKey[0] === 'serverDetails') {
      return {
        data: {
          server: {
            name: 'test-server',
            status: 'running',
            transport: 'http',
            repository_url: 'https://github.com/test/repo',
          },
        },
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useQuery>
    }

    // Check if this is the groups query
    if (
      Array.isArray(queryKey) &&
      queryKey[0] === 'api' &&
      queryKey[1] === 'v1beta' &&
      queryKey[2] === 'groups'
    ) {
      return {
        data: {
          groups: [
            { name: 'default', registered_clients: [] },
            { name: 'group1', registered_clients: [] },
            { name: 'group2', registered_clients: [] },
          ],
        },
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useQuery>
    }

    // For any other queries, return empty data
    return {
      data: null,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuery>
  })
})

it('navigates to logs page when logs menu item is clicked', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const user = userEvent.setup()
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const logsMenuItem = screen.getByRole('menuitem', { name: /logs/i })
  await user.click(logsMenuItem)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/logs/test-server')
  })
})

it('should show Add server to a group menu item', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const user = userEvent.setup()

  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const addToGroupMenuItem = screen.queryByRole('menuitem', {
    name: /add server to a group/i,
  })

  expect(addToGroupMenuItem).not.toBeNull()
  expect(addToGroupMenuItem).toBeVisible()
})
