import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Index } from '@/routes/index'
import { useMutationCreateGroup } from '@/features/mcp-servers/hooks/use-mutation-create-group'

// Mock the feature flag to enable groups
vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => true,
}))

// Mock the create group mutation hook
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
  const mockMutate = vi.fn()
  const mockMutateAsync = vi.fn()
  const mockReset = vi.fn()

  mockUseMutationCreateGroup.mockReturnValue({
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
    isLoading: false,
    isPending: false,
    isError: false,
    isSuccess: false,
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

    // Wait for the groups to load
    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    // 1. Check for the "Add a group" button
    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    expect(addGroupButton).toBeVisible()

    // 2. Click the button to open the modal
    await userEvent.click(addGroupButton)

    // 3. Verify modal opens with correct content
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check modal has correct heading, name field, and create button
    expect(
      screen.getByRole('heading', { name: /create a group/i })
    ).toBeVisible()

    const nameInput = screen.getByLabelText(/name/i)
    expect(nameInput).toBeVisible()
    // The Input component may not have explicit type="text" attribute, but should be an input element
    expect(nameInput.tagName).toBe('INPUT')

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeVisible()

    // 4. Enter a group name
    const testGroupName = 'Test Group'
    await userEvent.type(nameInput, testGroupName)
    expect(nameInput).toHaveValue(testGroupName)

    // 5. Click create button to close modal
    await userEvent.click(createButton)

    // 6. Verify modal disappears
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should call the create group mutation with the correct API payload on success path', async () => {
    const mockMutate = vi.fn()
    const mockMutateAsync = vi.fn()
    const mockReset = vi.fn()

    mockUseMutationCreateGroup.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isLoading: false,
      isPending: false,
      isError: false,
      isSuccess: false,
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

    // Wait for the groups to load
    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
    })

    // Click the "Add a group" button
    const addGroupButton = screen.getByRole('button', { name: /add a group/i })
    await userEvent.click(addGroupButton)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Enter a specific group name to test the payload
    const nameInput = screen.getByLabelText(/name/i)
    const testGroupName = 'Production Environment'
    await userEvent.type(nameInput, testGroupName)

    // Click create button
    const createButton = screen.getByRole('button', { name: /create/i })
    await userEvent.click(createButton)

    // Verify the mutation was called with the correct API payload structure
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        body: {
          name: 'Production Environment',
        },
      })
    })

    // Verify it was called exactly once
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })
})
