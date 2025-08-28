import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Index } from '@/routes/index'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => true,
}))

vi.mock('@/features/mcp-servers/hooks/use-mutation-create-group', () => ({
  useMutationCreateGroup: vi.fn(),
}))

const mockUseMutationCreateGroup = vi.mocked(useMutationCreateGroup)

const router = createTestRouter(Index)

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
  it('should allow creating a group through the complete workflow', async () => {
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

    const testGroupName = 'Test Group'
    await userEvent.type(nameInput, testGroupName)
    expect(nameInput).toHaveValue(testGroupName)

    await userEvent.click(createButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should call the create group mutation with the correct API payload on success path', async () => {
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
    const testGroupName = 'Production Environment'
    await userEvent.type(nameInput, testGroupName)

    const createButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: {
          name: 'Production Environment',
        },
      })
    })

    expect(mockMutateAsync).toHaveBeenCalledTimes(1)
  })

  it('should handle group name conflicts by suggesting an alternative name', async () => {
    const mockMutateAsync = vi
      .fn()
      .mockRejectedValueOnce({ status: 409 })
      .mockResolvedValueOnce({})
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
    await userEvent.type(nameInput, 'default')

    const createButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const newNameInput = screen.getByLabelText(/name/i)
    expect(newNameInput).toHaveValue('default-2')

    const createButton2 = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton2)

    expect(mockMutateAsync).toHaveBeenCalledTimes(2)
    expect(mockMutateAsync).toHaveBeenNthCalledWith(1, {
      body: { name: 'default' },
    })
    expect(mockMutateAsync).toHaveBeenNthCalledWith(2, {
      body: { name: 'default-2' },
    })
  })

  it('should prevent submission when group name is empty', async () => {
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
    expect(nameInput).toHaveValue('')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeVisible()

    await userEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeVisible()
    })
  })
})
