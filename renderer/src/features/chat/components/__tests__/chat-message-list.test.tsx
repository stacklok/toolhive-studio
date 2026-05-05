import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RefObject } from 'react'
import { ChatMessageList } from '../chat-message-list'
import type { ChatUIMessage } from '../../types'

// Stub ChatMessage to a marker so we can assert which rows are mounted.
vi.mock('../chat-message', () => ({
  ChatMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={`message-${message.id}`}>{message.id}</div>
  ),
}))

// jsdom lacks ResizeObserver — useVirtualizer needs it via observeElementRect.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeMessage(id: string, role: 'user' | 'assistant' = 'user') {
  return {
    id,
    role,
    parts: [],
  } as unknown as ChatUIMessage
}

function renderList(messages: ChatUIMessage[]) {
  // jsdom returns 0 for layout, so the virtualizer mounts only its
  // overscan window — exactly what these tests assert. `createRef` is
  // frozen in modern React, hence the plain mutable object.
  const scrollElementRef: RefObject<HTMLDivElement | null> = {
    current: document.createElement('div'),
  }

  return render(
    <ChatMessageList
      messages={messages}
      status="ready"
      isLoading={false}
      toolUiMetadata={{}}
      scrollElementRef={scrollElementRef}
    />
  )
}

describe('ChatMessageList', () => {
  describe('flat path (short threads)', () => {
    it('renders every message when length is at or under the virtualization threshold', () => {
      const messages = Array.from({ length: 5 }, (_, i) =>
        makeMessage(`m-${i}`)
      )
      renderList(messages)

      messages.forEach((m) => {
        expect(screen.getByTestId(`message-${m.id}`)).toBeInTheDocument()
      })
      expect(document.querySelector('[data-chat-inner]')).toBeInTheDocument()
    })
  })

  describe('virtualized path (long threads)', () => {
    it('does NOT mount every historical message when the thread exceeds the threshold', () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        makeMessage(`m-${i}`)
      )
      renderList(messages)

      const mounted = screen.queryAllByTestId(/^message-m-/)
      expect(mounted.length).toBeLessThan(messages.length)
    })

    it('always mounts the trailing tail messages in normal flow', () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        makeMessage(`m-${i}`)
      )
      renderList(messages)

      // Pins the contract: tail rows (streaming + preceding turn) never get culled.
      expect(screen.getByTestId('message-m-49')).toBeInTheDocument()
      expect(screen.getByTestId('message-m-48')).toBeInTheDocument()
    })

    it('exposes the data-chat-inner anchor so useAutoScroll can locate the inner wrapper', () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        makeMessage(`m-${i}`)
      )
      renderList(messages)
      expect(document.querySelector('[data-chat-inner]')).toBeInTheDocument()
    })
  })
})
