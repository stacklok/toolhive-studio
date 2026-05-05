import { MessageSquare } from 'lucide-react'
import { useMemo, type RefObject } from 'react'
import type { ChatStatus } from 'ai'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { ChatMessage } from './chat-message'
import type { ChatUIMessage } from '../types'
import type { ToolUiMetadataEntry } from '../hooks/use-mcp-app-metadata'
import { hasMcpUiPart } from '../lib/has-mcp-ui-part'

interface ChatMessageListProps {
  messages: ChatUIMessage[]
  status: ChatStatus
  isLoading: boolean
  toolUiMetadata: Record<string, ToolUiMetadataEntry>
  /** Scroll container ref owned by `useAutoScroll` in `ChatInterface`. */
  scrollElementRef: RefObject<HTMLDivElement | null>
}

const VIRTUALIZE_THRESHOLD = 10

// Trailing rows stay in normal flow so the streaming row's natural growth
// drives `useAutoScroll`'s scrollHeight follow.
const TAIL_SIZE = 2

// Low estimate biases toward over-rendering on first paint vs empty flashes.
const ROW_ESTIMATE_PX = 240

/**
 * Inner content of the chat scroll container. For long threads,
 * virtualizes historical messages and keeps the last `TAIL_SIZE` rows +
 * "Thinking..." indicator in normal flow. The wrapper carries
 * `data-chat-inner` so `useAutoScroll` finds it across both paths.
 */
export function ChatMessageList({
  messages,
  status,
  isLoading,
  toolUiMetadata,
  scrollElementRef,
}: ChatMessageListProps) {
  const shouldVirtualize = messages.length > VIRTUALIZE_THRESHOLD

  if (!shouldVirtualize) {
    return (
      <div data-chat-inner className="space-y-6 pt-8 pr-2 pb-24">
        {messages.map((message, index: number) => (
          <FlatMessageRow
            key={message.id}
            message={message}
            status={status}
            toolUiMetadata={toolUiMetadata}
            index={index}
          />
        ))}
        {isLoading && <ThinkingIndicator />}
      </div>
    )
  }

  return (
    <VirtualChatMessageList
      messages={messages}
      status={status}
      isLoading={isLoading}
      toolUiMetadata={toolUiMetadata}
      scrollElementRef={scrollElementRef}
    />
  )
}

function FlatMessageRow({
  message,
  status,
  toolUiMetadata,
  index,
}: {
  message: ChatUIMessage
  status: ChatStatus
  toolUiMetadata: Record<string, ToolUiMetadataEntry>
  index: number
}) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      style={{
        animationDelay: `${Math.min(index * 50, 200)}ms`,
        animationFillMode: 'both',
      }}
    >
      <ChatMessage
        status={status}
        message={message}
        toolUiMetadata={toolUiMetadata}
      />
    </div>
  )
}

function VirtualChatMessageList({
  messages,
  status,
  isLoading,
  toolUiMetadata,
  scrollElementRef,
}: ChatMessageListProps) {
  // `useVirtualizer` returns non-stable functions React Compiler can't memoize.
  // Opt this leaf out so the rest of the tree still benefits from auto-memo.
  'use no memo'
  // Last TAIL_SIZE rows (incl. streaming, if any) stay outside the virtualizer.
  const { historical, tail } = useMemo(() => {
    const splitAt = Math.max(0, messages.length - TAIL_SIZE)
    return {
      historical: messages.slice(0, splitAt),
      tail: messages.slice(splitAt),
    }
  }, [messages])

  // Rows hosting an `<McpAppView>` iframe must stay mounted so iframe DOM,
  // bridge connection, and any in-progress user input survive scroll
  // recycling. We extend the virtualizer's range to always include their
  // indices — that keeps them in `getVirtualItems()` with proper offsets
  // even when scrolled far out of the window.
  const pinnedIndices = useMemo(() => {
    const set = new Set<number>()
    historical.forEach((message, index) => {
      if (hasMcpUiPart(message, toolUiMetadata)) set.add(index)
    })
    return set
  }, [historical, toolUiMetadata])

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: historical.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    getItemKey: (index) => historical[index]!.id,
    overscan: 5,
    // Avoids React 19's `flushSync` warning (per TanStack Virtual docs).
    useFlushSync: false,
    rangeExtractor: (range) => {
      const base = defaultRangeExtractor(range)
      if (pinnedIndices.size === 0) return base
      const merged = new Set(base)
      pinnedIndices.forEach((i) => merged.add(i))
      return Array.from(merged).sort((a, b) => a - b)
    },
  })

  const totalSize = virtualizer.getTotalSize()
  const items = virtualizer.getVirtualItems()

  return (
    <div data-chat-inner className="pt-8 pr-2 pb-24">
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const message = historical[virtualRow.index]
          if (!message) return null
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="pb-6"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ChatMessage
                status={status}
                message={message}
                toolUiMetadata={toolUiMetadata}
              />
            </div>
          )
        })}
      </div>

      {tail.length > 0 && (
        <div className="space-y-6">
          {tail.map((message, idx) => (
            <FlatMessageRow
              key={message.id}
              message={message}
              status={status}
              toolUiMetadata={toolUiMetadata}
              index={idx}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className={tail.length > 0 ? 'mt-6' : undefined}>
          <ThinkingIndicator />
        </div>
      )}
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="animate-in fade-in-0 flex items-start gap-4 duration-500">
      <div
        className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center
          rounded-lg"
      >
        <MessageSquare className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div
              className="bg-muted-foreground h-1.5 w-1.5 animate-bounce
                rounded-full [animation-delay:-0.3s]"
            />
            <div
              className="bg-muted-foreground h-1.5 w-1.5 animate-bounce
                rounded-full [animation-delay:-0.15s]"
            />
            <div
              className="bg-muted-foreground h-1.5 w-1.5 animate-bounce
                rounded-full"
            />
          </div>
          <span className="text-muted-foreground text-sm">Thinking...</span>
        </div>
      </div>
    </div>
  )
}
