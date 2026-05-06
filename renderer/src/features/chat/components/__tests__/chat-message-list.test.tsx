import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RefObject } from 'react'
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from '@tanstack/react-virtual'
import { ChatMessageList } from '../chat-message-list'
import type { ChatUIMessage } from '../../types'

// Stub ChatMessage to a marker so we can assert which rows are mounted.
vi.mock('../chat-message', () => ({
  ChatMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={`message-${message.id}`}>{message.id}</div>
  ),
}))

// Spy on `useVirtualizer` to capture the options the component passes in,
// so we can drive `rangeExtractor` directly. Real virtualizer behavior in
// jsdom is unreliable (zero-sized layout) — this lets us test the pinning
// contract deterministically.
vi.mock('@tanstack/react-virtual', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-virtual')>()
  return {
    ...actual,
    useVirtualizer: vi.fn(actual.useVirtualizer),
  }
})

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

function makeMessage(
  id: string,
  role: 'user' | 'assistant' = 'user',
  parts: unknown[] = []
) {
  return {
    id,
    role,
    parts,
  } as unknown as ChatUIMessage
}

/** Tool-result part shape that matches `hasMcpUiPart`'s static-tool branch. */
function mcpToolResultPart(toolName: string) {
  return {
    type: `tool-${toolName}`,
    state: 'output-available',
    input: {},
    output: {},
  }
}

function renderList(
  messages: ChatUIMessage[],
  toolUiMetadata: Record<
    string,
    { resourceUri: string; serverName: string }
  > = {}
) {
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
      toolUiMetadata={toolUiMetadata}
      scrollElementRef={scrollElementRef}
    />
  )
}

/** Latest options passed to `useVirtualizer` (last render wins). */
function lastVirtualizerOptions() {
  const calls = vi.mocked(useVirtualizer).mock.calls
  return calls[calls.length - 1]?.[0]
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

  // Real-virtualizer DOM behaviour is unreliable under jsdom (zero-sized
  // layout means `getVirtualItems()` is essentially empty), so we validate
  // the pinning contract by inspecting the `rangeExtractor` we hand to the
  // virtualizer instead. The predicate (`hasMcpUiPart`) is unit-tested
  // separately under `lib/__tests__/has-mcp-ui-part.test.ts`.
  describe('MCP UI pinning (rangeExtractor)', () => {
    const SMALL_RANGE: Range = {
      startIndex: 0,
      endIndex: 1,
      count: 50,
      overscan: 5,
    }

    it('extends the virtualizer range with the indices of MCP UI messages', () => {
      const messages = Array.from({ length: 50 }, (_, i) => {
        if (i === 30) {
          return makeMessage(`m-${i}`, 'assistant', [
            mcpToolResultPart('weather'),
          ])
        }
        return makeMessage(`m-${i}`)
      })

      renderList(messages, {
        weather: { resourceUri: 'ui://weather/view.html', serverName: 's1' },
      })

      const opts = lastVirtualizerOptions()
      const range = opts?.rangeExtractor?.(SMALL_RANGE) ?? []
      const baseRange = defaultRangeExtractor(SMALL_RANGE)

      // The pinned historical index must show up even when the default
      // window doesn't include it.
      expect(baseRange).not.toContain(30)
      expect(range).toContain(30)
      // Pinning never drops items the default range would render.
      baseRange.forEach((i) => expect(range).toContain(i))
    })

    it('does not extend the range when no message hosts an MCP UI', () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        makeMessage(`m-${i}`)
      )

      renderList(messages, {})

      const opts = lastVirtualizerOptions()
      const range = opts?.rangeExtractor?.(SMALL_RANGE) ?? []
      expect(range).toEqual(defaultRangeExtractor(SMALL_RANGE))
    })

    it('does not pin tool-shaped parts whose tool has no registered UI metadata', () => {
      const messages = Array.from({ length: 50 }, (_, i) => {
        if (i === 30) {
          return makeMessage(`m-${i}`, 'assistant', [
            mcpToolResultPart('weather'),
          ])
        }
        return makeMessage(`m-${i}`)
      })

      // Same messages as the pinning test, but with NO ui metadata.
      renderList(messages, {})

      const opts = lastVirtualizerOptions()
      const range = opts?.rangeExtractor?.(SMALL_RANGE) ?? []
      expect(range).not.toContain(30)
    })
  })
})
