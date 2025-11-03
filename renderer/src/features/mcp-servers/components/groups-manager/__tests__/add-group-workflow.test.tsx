import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { GroupsManager } from '@/features/mcp-servers/components/groups-manager'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => true,
}))

vi.mock('@/features/mcp-servers/hooks/use-mutation-create-group', () => ({
  useMutationCreateGroup: vi.fn(),
}))

const mockUseMutationCreateGroup = vi.mocked(useMutationCreateGroup)

function createGroupsTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: function GroupRouteComponent() {
      const { groupName } = groupRoute.useParams()
      return <GroupsManager currentGroupName={groupName} />
    },
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
  })

  return router
}

const router = createGroupsTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(() => {
  vi.clearAllMocks()

  Object.defineProperty(window, 'electronAPI', {
    value: {
      shutdownStore: {
        getLastShutdownServers: vi.fn().mockResolvedValue([]),
        clearShutdownHistory: vi.fn().mockResolvedValue(undefined),
      },
      onServerShutdown: vi.fn().mockReturnValue(() => {}),
    },
    writable: true,
  })

  // Default mock implementation for create group mutation
  const mockMutateAsync = vi.fn().mockResolvedValue({})
  const mockReset = vi.fn()

  mockUseMutationCreateGroup.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    data: undefined,
    error: null,
    reset: mockReset,
    status: 'idle' as const,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    variables: undefined,
    context: undefined,
    submittedAt: 0,
  })
})

describe('Groups Manager - Add a group workflow', () => {
  it('allows creating a group through the complete workflow', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    expect(addGroupButton).toBeVisible()

    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(
      screen.getByRole('heading', { name: /create a group/i })
    ).toBeVisible()

    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toBeVisible()
    expect(nameInput.tagName).toBe('INPUT')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeVisible()

    const testGroupName = 'test group'
    await userEvent.type(nameInput, testGroupName)
    expect(nameInput).toHaveValue(testGroupName)

    await userEvent.click(createButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('calls the create group mutation with the correct API payload on success path', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    const mockReset = vi.fn()

    mockUseMutationCreateGroup.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      data: undefined,
      error: null,
      reset: mockReset,
      status: 'idle' as const,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      variables: undefined,
      context: undefined,
      submittedAt: 0,
    })

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const nameInput = screen.getByLabelText(/name/i)
    const testGroupName = 'production environment'
    await userEvent.type(nameInput, testGroupName)

    const createButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: {
          name: 'production environment',
        },
      })
    })

    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
  })

  it('allows creating groups with underscore in the name', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    const mockReset = vi.fn()

    mockUseMutationCreateGroup.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      data: undefined,
      error: null,
      reset: mockReset,
      status: 'idle' as const,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      variables: undefined,
      context: undefined,
      submittedAt: 0,
    })

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const nameInput = screen.getByLabelText(/name/i)

    await userEvent.type(nameInput, 'default_group')

    const createButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: {
          name: 'default_group',
        },
      })
    })

    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
  })

  it('prevents submission when group name is empty, button disabled', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    expect(addGroupButton).toBeVisible()

    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(
      screen.getByRole('heading', { name: /create a group/i })
    ).toBeVisible()

    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toHaveValue('')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()
  })

  it('prevents submission when group name contains uppercase letters', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.type(nameInput, 'TestGroup')

    await waitFor(() => {
      expect(
        screen.getByText(
          'Group name can only contain lowercase letters, numbers, underscores, hyphens, and spaces'
        )
      ).toBeVisible()
    })

    const mockMutateAsync = mockUseMutationCreateGroup().mutateAsync
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('prevents submission when group name has leading or trailing whitespace', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    await userEvent.click(addGroupButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.type(nameInput, ' test group ')

    await waitFor(() => {
      expect(
        screen.getByText(
          'Group name cannot have leading or trailing whitespace'
        )
      ).toBeVisible()
    })

    const mockMutateAsync = mockUseMutationCreateGroup().mutateAsync
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})
