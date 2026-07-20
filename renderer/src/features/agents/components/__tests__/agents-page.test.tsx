import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { AgentsPage } from '../agents-page'
import type { AgentConfig } from '@common/types/agents'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockAgentsApi = {
  list: vi.fn(),
  duplicate: vi.fn(),
}

const builtinAgent: AgentConfig = {
  id: 'builtin.toolhive-assistant',
  kind: 'builtin',
  name: 'ToolHive Assistant',
  description: 'Default assistant',
  instructions: 'Help users.',
  builtinToolsKey: null,
  createdAt: 0,
  updatedAt: 0,
}

const customAgent: AgentConfig = {
  id: 'custom.my-agent',
  kind: 'custom',
  name: 'My custom agent',
  description: 'Does cool things',
  instructions: 'Be cool.',
  builtinToolsKey: null,
  defaultModel: { provider: 'openai', model: 'gpt-4o' },
  createdAt: 0,
  updatedAt: 0,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return render(<AgentsPage />, { wrapper })
}

describe('AgentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        agents: mockAgentsApi,
      },
    } as unknown as typeof window.electronAPI

    mockAgentsApi.list.mockResolvedValue([builtinAgent, customAgent])
  })

  it('renders both built-in and custom agents in the All tab', async () => {
    renderPage()

    expect(await screen.findByText('ToolHive Assistant')).toBeInTheDocument()
    expect(screen.getByText('My custom agent')).toBeInTheDocument()
    expect(screen.getByText('Default assistant')).toBeInTheDocument()
    expect(screen.getByText('Does cool things')).toBeInTheDocument()
  })

  it('shows the default model for agents that have one', async () => {
    renderPage()

    await screen.findByText('My custom agent')
    expect(screen.getByText(/openai · gpt-4o/i)).toBeInTheDocument()
  })

  it('navigates to the agent detail page when a card is clicked', async () => {
    renderPage()

    await screen.findByText('ToolHive Assistant')
    await userEvent.click(screen.getByTestId('agent-card-custom.my-agent'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/playground/agents/$agentId',
      params: { agentId: 'custom.my-agent' },
    })
  })

  it('navigates to /playground/agents/new when "New agent" is clicked', async () => {
    renderPage()

    await screen.findByText('ToolHive Assistant')
    await userEvent.click(screen.getByTestId('create-agent'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/playground/agents/new',
    })
  })

  it('duplicates an agent and navigates to the copy', async () => {
    const copy: AgentConfig = {
      ...customAgent,
      id: 'custom.my-agent-copy',
      name: 'My custom agent (copy)',
    }
    mockAgentsApi.duplicate.mockResolvedValue({ success: true, agent: copy })

    renderPage()
    await screen.findByText('My custom agent')

    await userEvent.click(screen.getByTestId('duplicate-agent-custom.my-agent'))

    await waitFor(() => {
      expect(mockAgentsApi.duplicate).toHaveBeenCalledWith('custom.my-agent')
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/playground/agents/$agentId',
        params: { agentId: 'custom.my-agent-copy' },
      })
    })
  })

  it('clicking duplicate does not also trigger the card open handler', async () => {
    mockAgentsApi.duplicate.mockResolvedValue({
      success: true,
      agent: {
        ...customAgent,
        id: 'custom.my-agent-copy',
      },
    })

    renderPage()
    await screen.findByText('My custom agent')

    mockNavigate.mockClear()
    await userEvent.click(screen.getByTestId('duplicate-agent-custom.my-agent'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/playground/agents/$agentId',
      params: { agentId: 'custom.my-agent-copy' },
    })
  })

  it('renders the empty state when no agents exist', async () => {
    mockAgentsApi.list.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/no agents yet/i)).toBeInTheDocument()
  })

  it('filters to only built-in agents when the Built-in tab is selected', async () => {
    renderPage()
    await screen.findByText('ToolHive Assistant')

    await userEvent.click(screen.getByRole('tab', { name: /built-in/i }))

    expect(screen.getByText('ToolHive Assistant')).toBeInTheDocument()
    expect(screen.queryByText('My custom agent')).not.toBeInTheDocument()
  })

  it('filters to only custom agents when the Custom tab is selected', async () => {
    renderPage()
    await screen.findByText('ToolHive Assistant')

    await userEvent.click(screen.getByRole('tab', { name: /custom/i }))

    expect(screen.getByText('My custom agent')).toBeInTheDocument()
    expect(screen.queryByText('ToolHive Assistant')).not.toBeInTheDocument()
  })
})
