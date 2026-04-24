import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { AgentSelector } from '../agent-selector'
import type { AgentConfig } from '../../../../../../main/src/chat/agents/types'

// Radix DropdownMenu relies on pointer capture / ResizeObserver APIs that
// jsdom does not provide. Stub them so the dropdown can open in tests.
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn().mockReturnValue(false),
  writable: true,
})
Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true,
})
Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true,
})
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
})

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockAgentsApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  setThreadAgent: vi.fn(),
  getThreadAgentId: vi.fn(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const builtinToolhive: AgentConfig = {
  id: 'builtin.toolhive-assistant',
  kind: 'builtin',
  name: 'ToolHive Assistant',
  description: 'Default assistant',
  instructions: 'You are helpful.',
  builtinToolsKey: null,
  createdAt: 0,
  updatedAt: 0,
}

const builtinSkills: AgentConfig = {
  id: 'builtin.skills',
  kind: 'builtin',
  name: 'Skills Builder',
  description: 'Build skills',
  instructions: 'Help with skills.',
  builtinToolsKey: 'skills',
  createdAt: 0,
  updatedAt: 0,
}

const customAgent: AgentConfig = {
  id: 'custom.my-agent',
  kind: 'custom',
  name: 'My custom agent',
  description: 'Custom description',
  instructions: 'Do cool things.',
  builtinToolsKey: null,
  createdAt: 0,
  updatedAt: 0,
}

describe('AgentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        agents: mockAgentsApi,
      },
    } as unknown as typeof window.electronAPI

    mockAgentsApi.list.mockResolvedValue([
      builtinToolhive,
      builtinSkills,
      customAgent,
    ])
    mockAgentsApi.getThreadAgentId.mockResolvedValue(null)
    mockAgentsApi.setThreadAgent.mockResolvedValue({ success: true })
  })

  it('renders the default agent name when no thread agent is set', async () => {
    render(<AgentSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).toHaveTextContent(
        /ToolHive Assistant/i
      )
    })
  })

  it('renders the assigned thread agent name', async () => {
    mockAgentsApi.getThreadAgentId.mockResolvedValue('custom.my-agent')
    render(<AgentSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).toHaveTextContent(
        /My custom agent/i
      )
    })
  })

  it('switches the thread agent when the user picks a new one', async () => {
    const user = userEvent.setup()
    render(<AgentSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).not.toBeDisabled()
    })

    await user.click(screen.getByTestId('agent-selector'))

    const skillsItem = await screen.findByText('Skills Builder')
    await user.click(skillsItem)

    await waitFor(() => {
      expect(mockAgentsApi.setThreadAgent).toHaveBeenCalledWith(
        'thread-1',
        'builtin.skills'
      )
    })
  })

  it('navigates to /playground/agents when "Manage agents" is clicked', async () => {
    const user = userEvent.setup()
    render(<AgentSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).not.toBeDisabled()
    })

    await user.click(screen.getByTestId('agent-selector'))
    const manage = await screen.findByText('Manage agents')
    await user.click(manage)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/playground/agents' })
  })

  it('does not mutate when clicking the already-selected agent', async () => {
    const user = userEvent.setup()
    mockAgentsApi.getThreadAgentId.mockResolvedValue(
      'builtin.toolhive-assistant'
    )
    render(<AgentSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).toHaveTextContent(
        /ToolHive Assistant/i
      )
    })

    await user.click(screen.getByTestId('agent-selector'))
    const menuItems = await screen.findAllByRole('menuitem')
    const toolhiveItem = menuItems.find((el) =>
      el.textContent?.includes('ToolHive Assistant')
    )!
    await user.click(toolhiveItem)

    expect(mockAgentsApi.setThreadAgent).not.toHaveBeenCalled()
  })

  it('is disabled when no threadId is provided', async () => {
    render(<AgentSelector threadId={null} />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).toBeDisabled()
    })
  })
})
