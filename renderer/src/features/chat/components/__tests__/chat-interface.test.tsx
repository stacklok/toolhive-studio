import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React, { createRef } from 'react'
import { ChatInterface } from '../chat-interface'
import type { ChatUIMessage } from '../../types'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../thread-title-bar', () => ({
  ThreadTitleBar: (props: Record<string, unknown>) => (
    <div
      data-testid="thread-title-bar"
      data-title={props.title as string}
      data-starred={String(props.starred)}
    >
      <button
        onClick={() => (props.onRename as (t: string) => void)?.('renamed')}
      >
        rename
      </button>
      <button onClick={() => (props.onToggleStar as () => void)?.()}>
        toggleStar
      </button>
      <button onClick={() => (props.onDelete as () => void)?.()}>delete</button>
    </div>
  ),
}))

vi.mock('../chat-message', () => ({
  ChatMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={`message-${message.id}`}>{message.id}</div>
  ),
}))

vi.mock('../chat-input-prompt', () => ({
  ChatInputPrompt: () => <div data-testid="chat-input-prompt" />,
}))

vi.mock('../dialog-provider-settings', () => ({
  DialogProviderSettings: () => null,
}))

vi.mock('../error-alert', () => ({
  ErrorAlert: () => null,
}))

// Auto-scroll mock — controls showScrollToBottom via exposed setter
let mockShowScrollToBottom = false
const mockScrollToBottom = vi.fn()
const mockContainerRef = createRef<HTMLDivElement>()

vi.mock('../../hooks/use-auto-scroll', () => ({
  useAutoScroll: () => ({
    containerRef: mockContainerRef,
    showScrollToBottom: mockShowScrollToBottom,
    scrollToBottom: mockScrollToBottom,
  }),
}))

// useChatStreaming mock — controlled per test
const mockStreamingReturn = {
  status: 'idle' as const,
  messages: [] as ChatUIMessage[],
  isLoading: false,
  error: null,
  settings: { provider: '', model: '' } as Record<string, unknown>,
  updateSettings: vi.fn(),
  sendMessage: vi.fn(),
  cancelRequest: vi.fn(),
  isPersistentLoading: false,
  loadPersistedSettings: vi.fn(),
  clearMessages: vi.fn(),
  currentThreadId: null as string | null,
}

vi.mock('../../hooks/use-chat-streaming', () => ({
  useChatStreaming: () => mockStreamingReturn,
}))

vi.mock('../../lib/utils', () => ({
  hasCredentials: (settings: Record<string, unknown>) =>
    !!settings.apiKey || !!settings.endpointURL,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderInterface(
  props: React.ComponentProps<typeof ChatInterface> = {}
) {
  return render(<ChatInterface {...props} />)
}

function setMessages(messages: Partial<ChatUIMessage>[]) {
  mockStreamingReturn.messages = messages as ChatUIMessage[]
}

function resetMock() {
  mockStreamingReturn.status = 'idle'
  mockStreamingReturn.messages = []
  mockStreamingReturn.isLoading = false
  mockStreamingReturn.isPersistentLoading = false
  mockStreamingReturn.error = null
  mockStreamingReturn.settings = { provider: '', model: '' }
  mockShowScrollToBottom = false
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChatInterface', () => {
  beforeEach(() => {
    resetMock()
  })

  describe('ThreadTitleBar wiring', () => {
    it('renders ThreadTitleBar when threadId is provided', () => {
      renderInterface({ threadId: 'thread-1', threadTitle: 'My thread' })
      expect(screen.getByTestId('thread-title-bar')).toBeInTheDocument()
    })

    it('does NOT render ThreadTitleBar when threadId is absent', () => {
      renderInterface()
      expect(screen.queryByTestId('thread-title-bar')).not.toBeInTheDocument()
    })

    it('passes threadTitle to ThreadTitleBar', () => {
      renderInterface({ threadId: 'thread-1', threadTitle: 'Chat about birds' })
      expect(screen.getByTestId('thread-title-bar')).toHaveAttribute(
        'data-title',
        'Chat about birds'
      )
    })

    it('passes threadStarred to ThreadTitleBar', () => {
      renderInterface({ threadId: 'thread-1', threadStarred: true })
      expect(screen.getByTestId('thread-title-bar')).toHaveAttribute(
        'data-starred',
        'true'
      )
    })

    it('forwards onRenameThread callback to ThreadTitleBar', async () => {
      const onRenameThread = vi.fn()
      renderInterface({ threadId: 'thread-1', onRenameThread })
      screen.getByText('rename').click()
      expect(onRenameThread).toHaveBeenCalledWith('renamed')
    })

    it('forwards onToggleStar callback to ThreadTitleBar', async () => {
      const onToggleStar = vi.fn()
      renderInterface({ threadId: 'thread-1', onToggleStar })
      screen.getByText('toggleStar').click()
      expect(onToggleStar).toHaveBeenCalledOnce()
    })

    it('forwards onDeleteThread callback to ThreadTitleBar', async () => {
      const onDeleteThread = vi.fn()
      renderInterface({ threadId: 'thread-1', onDeleteThread })
      screen.getByText('delete').click()
      expect(onDeleteThread).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('shows "Loading chat history..." when isPersistentLoading is true', () => {
      mockStreamingReturn.isPersistentLoading = true
      renderInterface()
      expect(screen.getByText('Loading chat history...')).toBeInTheDocument()
    })

    it('hides messages area while loading', () => {
      mockStreamingReturn.isPersistentLoading = true
      setMessages([{ id: 'msg-1', role: 'user', parts: [] }])
      renderInterface()
      expect(screen.queryByTestId('message-msg-1')).not.toBeInTheDocument()
    })
  })

  describe('empty state (no messages, not loading)', () => {
    it('shows "Configure your providers" button when no provider is configured', () => {
      mockStreamingReturn.settings = { provider: '', model: '' }
      renderInterface()
      expect(
        screen.getByRole('button', { name: /configure your providers/i })
      ).toBeInTheDocument()
    })

    it('does not show ChatInputPrompt in empty state without provider', () => {
      mockStreamingReturn.settings = { provider: '', model: '' }
      renderInterface()
      expect(screen.queryByTestId('chat-input-prompt')).not.toBeInTheDocument()
    })

    it('shows centered ChatInputPrompt when provider and model are configured', () => {
      mockStreamingReturn.settings = {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-test',
      }
      renderInterface()
      expect(screen.getByTestId('chat-input-prompt')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /configure your providers/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('messages state', () => {
    beforeEach(() => {
      setMessages([
        { id: 'msg-1', role: 'user', parts: [] },
        { id: 'msg-2', role: 'assistant', parts: [] },
      ])
    })

    it('renders ChatMessage for each message', () => {
      renderInterface()
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
    })

    it('renders ChatInputPrompt at bottom when there are messages', () => {
      renderInterface()
      expect(screen.getByTestId('chat-input-prompt')).toBeInTheDocument()
    })

    it('shows "Thinking..." indicator when isLoading is true', () => {
      mockStreamingReturn.isLoading = true
      renderInterface()
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('does not show "Thinking..." when not loading', () => {
      mockStreamingReturn.isLoading = false
      renderInterface()
      expect(screen.queryByText('Thinking...')).not.toBeInTheDocument()
    })
  })

  describe('scroll-to-bottom button', () => {
    it('shows scroll-to-bottom button when showScrollToBottom is true', () => {
      setMessages([{ id: 'msg-1', role: 'user', parts: [] }])
      mockShowScrollToBottom = true
      renderInterface()
      expect(
        screen.getByRole('button', { name: 'Scroll to bottom' })
      ).toBeInTheDocument()
    })

    it('does not show scroll-to-bottom button when showScrollToBottom is false', () => {
      mockShowScrollToBottom = false
      renderInterface()
      // Only the "Configure your providers" button if no provider, or no button at all
      const buttons = screen.queryAllByRole('button')
      // None of them should have chevron-down characteristic (all labeled buttons are named)
      const unnamedButtons = buttons.filter(
        (b) => !b.getAttribute('aria-label') && !b.textContent?.trim()
      )
      expect(unnamedButtons).toHaveLength(0)
    })
  })
})
