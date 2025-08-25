import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Index } from '@/routes/index'

// Mock the feature flag to enable groups
vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => true,
}))

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
    expect(nameInput).toHaveAttribute('type', 'text')

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
})
