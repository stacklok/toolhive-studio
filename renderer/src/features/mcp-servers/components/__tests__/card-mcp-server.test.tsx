import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach } from 'vitest'
import { CardMcpServer } from '../card-mcp-server'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { useConfirm } from '@/common/hooks/use-confirm'
import { usePrompt } from '@/common/hooks/use-prompt'
import {
  getApiV1BetaRegistryByNameServersByServerName,
  getApiV1BetaGroups,
} from '@api/sdk.gen'

// Mock the hooks
vi.mock('@/common/hooks/use-confirm')
vi.mock('@/common/hooks/use-prompt')
vi.mock('@api/sdk.gen')

// Create mock functions
const mockUseConfirm = vi.mocked(useConfirm)
const mockUsePrompt = vi.mocked(usePrompt)
const mockGetApiV1BetaRegistryByNameServersByServerName = vi.mocked(
  getApiV1BetaRegistryByNameServersByServerName
)
const mockGetApiV1BetaGroups = vi.mocked(getApiV1BetaGroups)

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
  mockUsePrompt.mockReturnValue(vi.fn().mockResolvedValue(null))

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

  expect(router.state.location.pathname).toBe('/logs/test-server')
})

it('allows adding server to a group through the complete workflow', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('test-server')).toBeVisible()
  })

  const user = userEvent.setup()

  // Open the dropdown menu
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  // Click "Add server to a group" menu item
  const addToGroupMenuItem = screen.getByRole('menuitem', {
    name: /add server to a group/i,
  })
  await user.click(addToGroupMenuItem)

  // Verify the form opens with correct title
  expect(screen.getByText('Add server to a group')).toBeVisible()

  // Verify the form has the required field
  const groupDropdown = screen.getByLabelText('Select destination group')
  expect(groupDropdown).toBeVisible()
  expect(groupDropdown.tagName).toBe('SELECT')

  // Verify the submit button
  expect(screen.getByRole('button', { name: /copy/i })).toBeVisible()
})
