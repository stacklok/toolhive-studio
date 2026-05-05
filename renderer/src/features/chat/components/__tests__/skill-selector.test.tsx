import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { SkillSelector } from '../skill-selector'
import { mockedGetApiV1BetaSkills } from '@/common/mocks/fixtures/skills/get'
import type { AgentConfig } from '@common/types/agents'

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

const mockChatApi = {
  getEnabledSkills: vi.fn<(names?: readonly string[]) => Promise<string[]>>(),
  setEnabledSkill:
    vi.fn<
      (
        name: string,
        enabled: boolean
      ) => Promise<{ success: boolean; error?: string }>
    >(),
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
  name: 'Skill Engineer',
  description: 'Build and audit skills',
  instructions: 'Help with skills.',
  builtinToolsKey: 'skills',
  createdAt: 0,
  updatedAt: 0,
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

describe('SkillSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        agents: mockAgentsApi,
        getEnabledSkills: mockChatApi.getEnabledSkills,
        setEnabledSkill: mockChatApi.setEnabledSkill,
      },
    } as unknown as typeof window.electronAPI

    mockAgentsApi.list.mockResolvedValue([builtinToolhive, builtinSkills])
    mockAgentsApi.getThreadAgentId.mockResolvedValue('builtin.skills')
    mockChatApi.getEnabledSkills.mockResolvedValue([])
    mockChatApi.setEnabledSkill.mockResolvedValue({ success: true })

    // Default installed-skills response: one user-scope, one with no install
    // sites (so it still appears in the picker but renders no badges).
    mockedGetApiV1BetaSkills.override(() => ({
      skills: [
        {
          reference: 'algorithmic-art',
          scope: 'user',
          clients: ['claude-code'],
          metadata: {
            name: 'algorithmic-art',
            description: 'Algorithmic art with p5.js',
            version: 'v0.0.1',
          },
        },
        {
          reference: 'security-review',
          scope: 'user',
          clients: ['claude-code'],
          metadata: {
            name: 'security-review',
            description: 'Run a security audit',
          },
        },
      ],
    }))
  })

  it('exposes an aria-label on the compact trigger', async () => {
    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    // Wait for the agent + enabled-skills queries to settle so the selector
    // is rendered in its final, non-disabled state.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Skills picker' })
      ).not.toBeDisabled()
    })
  })

  it('shows the live enabled count on the trigger', async () => {
    mockChatApi.getEnabledSkills.mockResolvedValue(['algorithmic-art'])

    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      const trigger = screen.getByTestId('skill-selector-trigger')
      expect(trigger).toHaveTextContent('1')
    })
  })

  it('disables the trigger when the active agent does not bind the skills bundle', async () => {
    mockAgentsApi.getThreadAgentId.mockResolvedValue(
      'builtin.toolhive-assistant'
    )

    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('skill-selector-trigger')).toBeDisabled()
    })
  })

  it('toggles a skill via the IPC bridge', async () => {
    const user = userEvent.setup()

    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('skill-selector-trigger')).not.toBeDisabled()
    })

    await user.click(screen.getByTestId('skill-selector-trigger'))

    const algorithmicArt = await screen.findByRole('menuitemcheckbox', {
      name: /algorithmic-art/i,
    })
    await user.click(algorithmicArt)

    await waitFor(() => {
      expect(mockChatApi.setEnabledSkill).toHaveBeenCalledWith(
        'algorithmic-art',
        true
      )
    })
  })

  it('clear-all wipes every entry in the raw enabled-skills list, including stale rows', async () => {
    // Backend reports `algorithmic-art` is installed; the allow-list still
    // carries `uninstalled` from a previous install. Clear-all must wipe BOTH
    // — defense in depth alongside the server-side prune.
    mockChatApi.getEnabledSkills.mockResolvedValue([
      'algorithmic-art',
      'uninstalled',
    ])

    const user = userEvent.setup()

    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('skill-selector-trigger')).not.toBeDisabled()
    })

    await user.click(screen.getByTestId('skill-selector-trigger'))

    const clearButton = await screen.findByRole('button', {
      name: /clear enabled skills/i,
    })
    expect(clearButton).not.toBeDisabled()
    await user.click(clearButton)

    await waitFor(() => {
      expect(mockChatApi.setEnabledSkill).toHaveBeenCalledWith(
        'algorithmic-art',
        false
      )
    })
    expect(mockChatApi.setEnabledSkill).toHaveBeenCalledWith(
      'uninstalled',
      false
    )
  })

  it('disables clear-all when the raw allow-list is empty', async () => {
    mockChatApi.getEnabledSkills.mockResolvedValue([])

    const user = userEvent.setup()

    render(<SkillSelector threadId="thread-1" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByTestId('skill-selector-trigger')).not.toBeDisabled()
    })

    await user.click(screen.getByTestId('skill-selector-trigger'))

    const clearButton = await screen.findByRole('button', {
      name: /clear enabled skills/i,
    })
    expect(clearButton).toBeDisabled()
  })
})
