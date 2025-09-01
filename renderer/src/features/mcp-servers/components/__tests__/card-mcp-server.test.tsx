import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { useConfirm } from '@/common/hooks/use-confirm'
import { usePrompt } from '@/common/hooks/use-prompt'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'

// Mock the hooks
vi.mock('@/common/hooks/use-confirm')
vi.mock('@/common/hooks/use-prompt')
vi.mock('@/common/hooks/use-feature-flag')

// Create mock functions
const mockUseConfirm = vi.mocked(useConfirm)
const mockUsePrompt = vi.mocked(usePrompt)
const mockUseFeatureFlag = vi.mocked(useFeatureFlag)

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

  // Reset router state
  router.navigate({ to: '/' })
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
