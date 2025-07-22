import { screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { Index } from '../index'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { MOCK_MCP_SERVERS } from '@/common/mocks/fixtures/servers'
import userEvent from '@testing-library/user-event'
import * as restartServerHook from '@/features/mcp-servers/hooks/use-mutation-restart-server'

const router = createTestRouter(Index)

// Mock electron API
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

const mockClipboard = {
  writeText: vi.fn(),
  readText: vi.fn(),
}

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()

  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: mockClipboard,
  })
})

it('renders list of MCP servers', async () => {
  renderRoute(router)
  await waitFor(() => {
    for (const mcpServer of MOCK_MCP_SERVERS) {
      expect(
        screen.queryByText(mcpServer.name),
        `Expected ${mcpServer.name} to be in the document`
      ).toBeVisible()
    }
  })
})

it('contains the menu to run an MCP server', async () => {
  renderRoute(router)
  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: /add server/i,
      })
    ).toBeVisible()
  })

  await userEvent.click(
    screen.getByRole('button', {
      name: /add server/i,
    })
  )
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeVisible()
  })
  expect(
    screen.getByRole('menuitem', { name: 'From the registry' })
  ).toBeVisible()
  expect(
    screen.getByRole('menuitem', { name: 'Custom MCP server' })
  ).toBeVisible()
})

it('restarts server', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen
    .getByText('postgres-db')
    .closest('[data-slot="card"]') as HTMLElement
  const postgresSwitch = within(postgresCard).getByRole('switch', {
    name: /mutate server/i,
  })

  expect(postgresSwitch).not.toBeChecked()

  await userEvent.click(postgresSwitch)

  await waitFor(() => {
    expect(postgresSwitch).toBeChecked()
  })
})

it('stops server', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('vscode-server')).toBeVisible()
  })

  const vscodeCard = screen
    .getByText('vscode-server')
    .closest('[data-slot="card"]') as HTMLElement
  const vscodeSwitch = within(vscodeCard).getByRole('switch', {
    name: /mutate server/i,
  })

  expect(vscodeSwitch).toBeChecked()

  await userEvent.click(vscodeSwitch)

  await waitFor(() => {
    expect(vscodeSwitch).not.toBeChecked()
  })
})

it('shows dropdown menu with URL and remove option when clicking more options button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen
    .getByText('postgres-db')
    .closest('[data-slot="card"]') as HTMLElement
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)

  const urlInput = screen.getByDisplayValue(MOCK_MCP_SERVERS[0].url)
  expect(urlInput).toBeVisible()
  expect(urlInput).toHaveAttribute('readonly')
  expect(screen.getByRole('button', { name: 'Copy URL' })).toBeVisible()

  expect(
    screen.getByRole('menuitem', { name: /github repository/i })
  ).toBeVisible()
  expect(screen.getByRole('menuitem', { name: /remove/i })).toBeVisible()
})

it('copies URL to clipboard when clicking copy button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen
    .getByText('postgres-db')
    .closest('[data-slot="card"]') as HTMLElement
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  await userEvent.click(moreOptionsButton)

  const copyButton = screen.getByRole('button', { name: 'Copy URL' })
  await userEvent.click(copyButton)

  expect(mockClipboard.writeText).toHaveBeenCalledWith(MOCK_MCP_SERVERS[0].url)
})

it('allows deleting a server through the dropdown menu', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const postgresCard = screen
    .getByText('postgres-db')
    .closest('[data-slot="card"]') as HTMLElement
  const moreOptionsButton = within(postgresCard).getByRole('button', {
    name: /more options/i,
  })

  // Open dropdown and verify remove option
  await userEvent.click(moreOptionsButton)
  const removeMenuItem = screen.getByRole('menuitem', { name: /remove/i })
  expect(removeMenuItem).toBeVisible()

  // Click remove and verify confirmation dialog
  await userEvent.click(removeMenuItem)
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText(/confirm removal/i)).toBeInTheDocument()
  })

  // Confirm deletion
  const confirmButton = screen.getByRole('button', { name: /remove/i })
  await userEvent.click(confirmButton)
})

describe('Shutdown server restart', () => {
  let mockMutateAsync: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockMutateAsync = vi.fn()
    vi.spyOn(
      restartServerHook,
      'useMutationRestartServerAtStartup'
    ).mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as unknown as ReturnType<
      typeof restartServerHook.useMutationRestartServerAtStartup
    >)
  })

  it('restart servers from last shutdown when servers exist', async () => {
    const shutdownServers = [
      { name: 'server1', status: 'stopped' },
      { name: 'server2', status: 'stopped' },
    ]
    window.electronAPI.shutdownStore.getLastShutdownServers = vi
      .fn()
      .mockResolvedValue(shutdownServers)

    renderRoute(router)

    await waitFor(() => {
      expect(
        window.electronAPI.shutdownStore.getLastShutdownServers
      ).toHaveBeenCalledOnce()
      expect(mockMutateAsync).toHaveBeenCalledWith({
        body: { names: ['server1', 'server2'] },
      })
    })
  })

  it('not restart servers when no servers from last shutdown', async () => {
    window.electronAPI.shutdownStore.getLastShutdownServers = vi
      .fn()
      .mockResolvedValue([])

    renderRoute(router)

    await waitFor(() => {
      expect(
        window.electronAPI.shutdownStore.getLastShutdownServers
      ).toHaveBeenCalledOnce()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(
      window.electronAPI.shutdownStore.clearShutdownHistory
    ).not.toHaveBeenCalled()
  })
})
