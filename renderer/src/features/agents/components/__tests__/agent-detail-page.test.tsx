import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { AgentDetailPage } from '../agent-detail-page'
import type { AgentConfig } from '../../../../../../main/src/chat/agents/types'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const mockConfirm = vi.fn()
vi.mock('@/common/hooks/use-confirm', () => ({
  useConfirm: () => mockConfirm,
}))

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}))

vi.mock('@streamdown/code', () => ({ code: {} }))
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }))
vi.mock('@streamdown/cjk', () => ({ cjk: {} }))

vi.mock('@/features/skills/components/skill-detail-layout', () => ({
  SkillDetailLayout: ({
    title,
    badges,
    description,
    actions,
    rightPanel,
  }: {
    title: string
    badges?: ReactNode
    description?: string | null
    actions: ReactNode
    rightPanel?: ReactNode
  }) => (
    <div data-testid="skill-detail-layout">
      <h1>{title}</h1>
      <div data-testid="badges">{badges}</div>
      {description && <p data-testid="description">{description}</p>}
      <div data-testid="actions">{actions}</div>
      {rightPanel && <div data-testid="right-panel">{rightPanel}</div>}
    </div>
  ),
}))

const mockAgentsApi = {
  delete: vi.fn(),
  duplicate: vi.fn(),
}

const builtinAgent: AgentConfig = {
  id: 'builtin.toolhive-assistant',
  kind: 'builtin',
  name: 'ToolHive Assistant',
  description: 'Default assistant description',
  instructions: '# System prompt\n\nBe helpful.',
  builtinToolsKey: null,
  createdAt: 0,
  updatedAt: 0,
}

const customAgent: AgentConfig = {
  id: 'custom.my-agent',
  kind: 'custom',
  name: 'My custom agent',
  description: 'Custom description',
  instructions: 'Do cool things.',
  builtinToolsKey: 'skills',
  defaultModel: { provider: 'openai', model: 'gpt-4o' },
  createdAt: 0,
  updatedAt: 0,
}

function renderDetail(agent: AgentConfig) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return render(<AgentDetailPage agent={agent} />, { wrapper })
}

describe('AgentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        agents: mockAgentsApi,
      },
    } as unknown as typeof window.electronAPI
    mockAgentsApi.delete.mockResolvedValue({ success: true })
  })

  describe('built-in agents', () => {
    it('shows the agent name, description, kind badge, and system prompt', () => {
      renderDetail(builtinAgent)

      expect(screen.getByText('ToolHive Assistant')).toBeInTheDocument()
      expect(
        screen.getByText('Default assistant description')
      ).toBeInTheDocument()
      expect(screen.getByTestId('badges')).toHaveTextContent(/builtin/i)
      expect(screen.getByTestId('streamdown')).toHaveTextContent(
        '# System prompt'
      )
    })

    it('does NOT show edit or delete buttons', () => {
      renderDetail(builtinAgent)
      expect(
        screen.queryByTestId('edit-agent-builtin.toolhive-assistant')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('delete-agent-builtin.toolhive-assistant')
      ).not.toBeInTheDocument()
    })

    it('shows the "curated by ToolHive" hint for built-ins', () => {
      renderDetail(builtinAgent)
      expect(
        screen.getByText(
          /built-in agents are curated by toolhive and cannot be edited/i
        )
      ).toBeInTheDocument()
    })

    it('always shows the Duplicate button', async () => {
      mockAgentsApi.duplicate.mockResolvedValue({
        ...builtinAgent,
        id: 'custom.copy-of-toolhive',
        kind: 'custom',
        name: 'ToolHive Assistant (copy)',
      })

      renderDetail(builtinAgent)
      await userEvent.click(
        screen.getByTestId('duplicate-agent-builtin.toolhive-assistant')
      )

      await waitFor(() => {
        expect(mockAgentsApi.duplicate).toHaveBeenCalledWith(
          'builtin.toolhive-assistant'
        )
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/playground/agents/$agentId',
          params: { agentId: 'custom.copy-of-toolhive' },
        })
      })
    })
  })

  describe('custom agents', () => {
    it('renders edit and delete actions and the built-in tools badge', () => {
      renderDetail(customAgent)

      expect(
        screen.getByTestId('edit-agent-custom.my-agent')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('delete-agent-custom.my-agent')
      ).toBeInTheDocument()
      expect(screen.getByText(/skills tools/i)).toBeInTheDocument()
    })

    it('renders default model when present', () => {
      renderDetail(customAgent)
      expect(screen.getByText(/openai · gpt-4o/i)).toBeInTheDocument()
    })

    it('navigates to the edit page when Edit is clicked', async () => {
      renderDetail(customAgent)

      await userEvent.click(screen.getByTestId('edit-agent-custom.my-agent'))

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/playground/agents/$agentId/edit',
        params: { agentId: 'custom.my-agent' },
      })
    })

    it('confirms then deletes the agent and navigates back to the list', async () => {
      renderDetail(customAgent)

      await userEvent.click(screen.getByTestId('delete-agent-custom.my-agent'))

      await waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      await waitFor(() => {
        expect(mockAgentsApi.delete).toHaveBeenCalledWith('custom.my-agent')
        expect(mockNavigate).toHaveBeenCalledWith({
          to: '/playground/agents',
        })
      })
    })

    it('does NOT delete when the confirm dialog is cancelled', async () => {
      mockConfirm.mockResolvedValue(false)
      renderDetail(customAgent)

      await userEvent.click(screen.getByTestId('delete-agent-custom.my-agent'))
      await waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      expect(mockAgentsApi.delete).not.toHaveBeenCalled()
    })

    it('shows an error toast when delete fails', async () => {
      mockAgentsApi.delete.mockResolvedValue({
        success: false,
        error: 'boom',
      })
      renderDetail(customAgent)

      await userEvent.click(screen.getByTestId('delete-agent-custom.my-agent'))
      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('boom'))
    })
  })

  it('renders an empty-prompt placeholder when instructions are blank', () => {
    renderDetail({ ...customAgent, instructions: '   ' })
    expect(
      screen.getByText(/this agent has no system prompt yet/i)
    ).toBeInTheDocument()
  })

  it('renders the inheriting-model copy when no defaultModel is set', () => {
    renderDetail({ ...customAgent, defaultModel: undefined })
    expect(
      screen.getByText(/inherits the model selected in chat/i)
    ).toBeInTheDocument()
  })
})
